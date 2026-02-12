import { Pinecone } from '@pinecone-database/pinecone';

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
        let key = apiKey;
        // Safe check for process.env in case we are in browser
        if (!key && typeof process !== 'undefined' && process.env) {
            key = process.env.PINECONE_API_KEY;
        }

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

    async validateIndex(expectedDimension: number): Promise<boolean> {
        if (!this.client) throw new Error('Pinecone Client not initialized.');
        try {
            const indexDescription = await this.client.describeIndex(this.indexName);
            if (indexDescription.dimension !== expectedDimension) {
                console.error(`❌ Index Dimension Mismatch!`);
                console.error(`   - Expected: ${expectedDimension}`);
                console.error(`   - Found: ${indexDescription.dimension}`);
                console.error(`   Please DELETE and RECREATE the index '${this.indexName}' with dimension ${expectedDimension}.`);
                return false;
            }
            return true;
        } catch (error: any) {
            // Check for 404 Not Found (Index doesn't exist)
            if (error?.message?.includes('404') || error?.status === 404) {
                console.log(`⚠️ Index '${this.indexName}' not found. Creating it with dimension ${expectedDimension}...`);
                await this.createIndexIfNotExists(expectedDimension);
                return true;
            }

            console.warn('Could not validate index dimension (API error). check logs.', error);
            // If we can't validate, we'll try to proceed, but upsert might fail if index really doesn't exist 
            // and creation failed above.
            return true;
        }
    }

    async upsertVectors(vectors: { id: string, values: number[], metadata: any }[]) {
        const index = this.getIndex();

        // Batch upsert (Pinecone limit is usually 100-1000)
        const batchSize = 100;
        try {
            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                console.log(`Debug Upsert: ID=${batch[0].id}, ValuesLen=${batch[0].values.length}`);
                await index.upsert({ records: batch as any }); // v7 signature
                console.log(`Upserted batch ${(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
            }
        } catch (error) {
            console.error('❌ Error during Pinecone Upsert:', error);
            if (error instanceof Error) {
                console.error('Message:', error.message);
                console.error('Stack:', error.stack);
                // @ts-ignore
                if (error.cause) console.error('Cause:', error.cause);
            }
            throw error;
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
