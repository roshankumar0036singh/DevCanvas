
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

export interface VectorMatch {
    id: string;
    score: number;
    metadata: {
        filePath: string;
        content: string;
        startLine: number;
        endLine: number;
        [key: string]: any;
    };
}

export class VectorStore {
    private client: Pinecone | null = null;
    private indexName: string = 'devcanvas-codebase';

    constructor(apiKey?: string) {
        const key = apiKey || process.env.PINECONE_API_KEY;
        if (key) {
            this.client = new Pinecone({ apiKey: key });
        }
    }

    private getIndex() {
        if (!this.client) throw new Error('Pinecone Client not initialized. Missing API Key.');
        return this.client.index(this.indexName);
    }

    async createIndexIfNotExists(dimension: number = 1536) { // 1536 for text-embedding-3-small
        if (!this.client) throw new Error('Pinecone Client not initialized.');

        try {
            const existingIndexes = await this.client.listIndexes();
            const indexExists = existingIndexes.indexes?.some(idx => idx.name === this.indexName);

            if (!indexExists) {
                console.log(`Creating Pinecone index: ${this.indexName}`);
                await this.client.createIndex({
                    name: this.indexName,
                    dimension: dimension,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                // Wait for initialization
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            console.error('Error creating index:', error);
            throw error;
        }
    }

    async upsertVectors(vectors: { id: string, values: number[], metadata: any }[]) {
        const index = this.getIndex();

        // Batch upsert (Pinecone limit is usually 100-1000)
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch as any);
            console.log(`Upserted batch ${(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
        }
    }

    async query(vector: number[], topK: number = 5): Promise<VectorMatch[]> {
        const index = this.getIndex();
        const results = await index.query({
            vector,
            topK,
            includeMetadata: true
        });

        return results.matches.map(match => ({
            id: match.id,
            score: match.score || 0,
            metadata: match.metadata as any
        }));
    }
}
