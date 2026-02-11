
import { VectorStore } from './vectorStore';
import { generateEmbedding, askCodebase } from '../aiService';
import { Settings } from '../storage';

export async function queryCodebase(query: string, options: {
    pineconeApiKey?: string,
    openaiApiKey?: string,
    aiProvider?: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral'
}): Promise<string> {
    console.log(`🔍 Querying codebase: "${query}"`);

    // 1. Initialize Vector Store
    const vectorStore = new VectorStore(options.pineconeApiKey);

    // 2. Mock Settings
    const settings: Settings = {
        aiProvider: options.aiProvider || 'openai',
        apiKeys: { [options.aiProvider || 'openai']: options.openaiApiKey },
        theme: 'dark',
        autoSync: false,
        defaultDiagramType: 'mermaid'
    };

    // 3. Generate Query Embedding
    console.log('🧠 Generating embedding for query...');
    const queryVector = await generateEmbedding(query, settings);

    // 4. Search Vectors
    console.log('📡 Searching Vector DB...');
    const matches = await vectorStore.query(queryVector, 5); // Top 5 chunks

    if (matches.length === 0) {
        return "I couldn't find any relevant code in the codebase to answer your question. Have you ingested the codebase yet?";
    }

    // 5. Construct Context
    const context = matches.map(m => `
File: ${m.metadata.filePath} (Lines ${m.metadata.startLine}-${m.metadata.endLine})
score: ${m.score}
Content:
\`\`\`${m.metadata.fileType ? m.metadata.fileType.substring(1) : ''}
${m.metadata.content}
\`\`\`
`).join('\n---\n');

    console.log(`📄 Found ${matches.length} relevant code chunks.`);

    // 6. Ask LLM
    console.log('🤖 Asking AI...');
    const answer = await askCodebase(query, context, settings);

    return answer;
}
