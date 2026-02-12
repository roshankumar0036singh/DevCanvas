
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { generateEmbedding } from '../aiService';
import { VectorStore } from './vectorStore';
import { Settings } from '../storage';
import { GitHubService } from '../githubService';

interface IngestionOptions {
    pineconeApiKey?: string;
    aiProvider?: 'openai' | 'mistral';
    aiApiKey?: string;
    githubToken?: string;
    exclude?: string[];
    onProgress?: (progress: number, message: string) => void;
}

export async function ingestGitHubRepo(
    repoUrl: string, // owner/repo
    options: IngestionOptions
) {
    const [owner, repo] = repoUrl.split('/');
    if (!owner || !repo) {
        throw new Error('Invalid repository URL. Format: owner/repo');
    }

    const progress = options.onProgress || (() => { });
    progress(0, 'Initializing...');

    // 1. Initialize Services
    const vectorStore = new VectorStore(options.pineconeApiKey);
    const github = new GitHubService(options.githubToken);

    // Check Dimension
    const provider = options.aiProvider || 'openai';
    const dims = provider === 'mistral' ? 1024 : 1536;

    progress(5, `Validating index dimension for ${provider}...`);
    const isValid = await vectorStore.validateIndex(dims);

    if (!isValid) {
        throw new Error(`Index dimension mismatch. Please check your Pinecone index. Expected ${dims} for ${provider}.`);
    }

    // 2. Fetch Tree
    progress(10, 'Fetching repository structure...');
    let tree: any[] = [];
    try {
        tree = await github.fetchRepoTree(owner, repo, 'main');
    } catch (e) {
        try {
            tree = await github.fetchRepoTree(owner, repo, 'master');
        } catch (e2) {
            // Try default branch if we can fetch repo details? 
            // For now just fail.
            throw new Error('Could not fetch repository tree. Ensure repo is public or token is valid.');
        }
    }

    // Filter files
    const supportedExts = ['.ts', '.tsx', '.js', '.jsx', '.go', '.py', '.java', '.md', '.json', '.html', '.css'];
    const filesToIngest = tree.filter(item => {
        if (item.type !== 'blob') return false;
        const ext = '.' + item.path.split('.').pop();
        if (!supportedExts.includes(ext)) return false;
        if (item.path.includes('node_modules') || item.path.includes('dist') || item.path.startsWith('.')) return false;
        return true;
    });

    progress(15, `Found ${filesToIngest.length} files. Starting ingestion...`);

    // 3. Chunking Configuration
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", " ", ""]
    });

    const settings: Settings = {
        aiProvider: provider as any,
        apiKeys: { [provider]: options.aiApiKey },
        theme: 'dark',
        autoSync: false,
        defaultDiagramType: 'mermaid'
    };

    let processedCount = 0;
    let vectorBatch: { id: string, values: number[], metadata: any }[] = [];
    const UPSERT_BATCH_SIZE = 50; // Upsert every 50 vectors/chunks

    for (const file of filesToIngest) {
        // Skip large files check (size is in bytes)
        if (file.size && file.size > 100000) continue; // 100KB limit for browser

        try {
            const content = await github.fetchFileContent(owner, repo, file.path);
            const chunks = await splitter.createDocuments([content]);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const text = `File: ${file.path}\n---\n${chunk.pageContent}`;

                // Embed
                const embedding = await generateEmbedding(text, settings);

                vectorBatch.push({
                    id: `${file.path}::chunk${i}`,
                    values: embedding,
                    metadata: {
                        filePath: file.path,
                        content: chunk.pageContent,
                        startLine: chunk.metadata.loc?.lines?.from || 0,
                        endLine: chunk.metadata.loc?.lines?.to || 0,
                        fileType: '.' + file.path.split('.').pop()
                    }
                });
            }

            // Flush batch if full
            if (vectorBatch.length >= UPSERT_BATCH_SIZE) {
                await vectorStore.upsertVectors(vectorBatch);
                vectorBatch = []; // Clear batch
            }

        } catch (error) {
            console.warn(`Failed to process ${file.path}`, error);
        }

        processedCount++;
        const percent = 15 + Math.floor((processedCount / filesToIngest.length) * 80);
        if (processedCount % 5 === 0) {
            progress(percent, `Processed ${processedCount}/${filesToIngest.length} files...`);
        }
    }

    // Flush remaining vectors
    if (vectorBatch.length > 0) {
        await vectorStore.upsertVectors(vectorBatch);
    }

    progress(100, 'Ingestion Complete!');
}
