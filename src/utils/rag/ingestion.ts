
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { generateEmbedding } from '../aiService';
import { VectorStore } from './vectorStore';
import { Settings } from '../storage';

export async function ingestCodebase(rootDir: string, options: {
    pineconeApiKey?: string,
    aiProvider?: 'openai' | 'mistral',
    aiApiKey?: string,
    exclude?: string[]
} = {}) {
    console.log('🚀 Starting codebase ingestion...');

    // 1. Initialize Vector Store
    const vectorStore = new VectorStore(options.pineconeApiKey);

    // Check Dimension
    const provider = options.aiProvider || 'openai';
    const dims = provider === 'mistral' ? 1024 : 1536;

    console.log(`📏 Validating index dimension for ${provider} (Expected: ${dims})...`);
    const isValid = await vectorStore.validateIndex(dims);

    if (!isValid) {
        throw new Error(`Index dimension mismatch. Please check your Pinecone index. Expected ${dims} for ${provider}.`);
    }

    // Create index if needed (default dimensions for text-embedding-3-small)
    // We might need to make this configurable or check if user exists
    // For now, assume user has created index or we try to create 'devcanvas-codebase'
    // But creation is async and slow. Better to assume specific index exists or fail friendly.
    // The VectorStore class handles creation if missing.

    // 2. Scan Files
    const files = await glob('**/*.{ts,tsx,js,jsx,go,py,java,md,json,html,css}', {
        cwd: rootDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', ...(options.exclude || [])],
        nodir: true,
        absolute: true
    });
    console.log(`📂 Found ${files.length} files to ingest.`);

    // 3. Chunking Configuration
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", " ", ""] // Standard code splitters
    });

    const vectors: { id: string, values: number[], metadata: any }[] = [];

    // Mock Settings for AI Service
    const settings: Settings = {
        aiProvider: provider,
        apiKeys: { [provider]: options.aiApiKey },
        theme: 'dark',
        autoSync: false,
        defaultDiagramType: 'mermaid'
    };

    let processedCount = 0;

    // 4. Process Files
    for (const filePath of files) {
        const relativePath = path.relative(rootDir, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Skip large files?
        if (content.length > 50000) {
            console.warn(`⚠️ Skipping large file: ${relativePath}`);
            continue;
        }

        const chunks = await splitter.createDocuments([content]);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const text = `File: ${relativePath}\n---\n${chunk.pageContent}`;

            try {
                const embedding = await generateEmbedding(text, settings);

                vectors.push({
                    id: `${relativePath}::chunk${i}`,
                    values: embedding,
                    metadata: {
                        filePath: relativePath,
                        content: chunk.pageContent,
                        startLine: chunk.metadata.loc?.lines?.from || 0,
                        endLine: chunk.metadata.loc?.lines?.to || 0,
                        fileType: path.extname(filePath)
                    }
                });
            } catch (error) {
                console.error(`❌ Failed to embed ${relativePath} chunk ${i}:`, error);
            }
        }

        processedCount++;
        if (processedCount % 10 === 0) {
            console.log(`⏳ Processed ${processedCount}/${files.length} files...`);
        }
    }

    console.log(`🧠 Generated ${vectors.length} vectors.`);

    // 5. Upsert to Pinecone
    if (vectors.length > 0) {
        console.log('📡 Uploading to Pinecone...');
        await vectorStore.upsertVectors(vectors);
        console.log('✅ Ingestion Complete!');
    } else {
        console.warn('⚠️ No vectors generated.');
    }
}
