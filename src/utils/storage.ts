// Storage Manager for DevCanvas
// Provides a clean API for Chrome Storage operations

export interface Settings {
    theme: 'light' | 'dark';
    aiProvider: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral';
    apiKeys: {
        openai?: string;
        anthropic?: string;
        gemini?: string;
        groq?: string;
        mistral?: string;
        pinecone?: string;
    };
    apiKey?: string; // Deprecated
    autoSync: boolean;
    defaultDiagramType: 'mermaid' | 'plantuml';
    githubToken?: string;
}

export interface Diagram {
    id: string;
    title: string;
    type: 'mermaid' | 'plantuml' | 'ai-generated';
    content: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    metadata?: {
        viewPath?: string;
        repoStructure?: string;
        extraContext?: string;
        [key: string]: unknown;
    };
}

export interface Document {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}

export interface StorageData {
    settings: Settings;
    diagrams: Diagram[];
    documents: Document[];
    recentItems: Array<{ type: 'diagram' | 'document'; id: string }>;
}

class StorageManager {
    private static instance: StorageManager;

    private constructor() { }

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    // Get all storage data
    async getAll(): Promise<Partial<StorageData>> {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (data) => {
                resolve(data as Partial<StorageData>);
            });
        });
    }

    // Get specific keys
    async get<K extends keyof StorageData>(
        keys: K[]
    ): Promise<Pick<StorageData, K>> {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (data) => {
                resolve(data as Pick<StorageData, K>);
            });
        });
    }

    // Set data
    async set(data: Partial<StorageData>): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    // Settings operations
    async getSettings(): Promise<Settings> {
        const data = await this.get(['settings']);
        const defaults: Settings = {
            theme: 'dark',
            aiProvider: 'openai',
            apiKeys: {},
            autoSync: true,
            defaultDiagramType: 'mermaid',
        };

        if (!data.settings) return defaults;

        // Migration: ensure apiKeys object exists
        const settings = { ...defaults, ...data.settings };
        if (!settings.apiKeys) {
            settings.apiKeys = {};
        }

        // Migrate old single key if needed
        if (settings.apiKey && !settings.apiKeys[settings.aiProvider]) {
            settings.apiKeys[settings.aiProvider] = settings.apiKey;
        }

        return settings;
    }

    async updateSettings(settings: Partial<Settings>): Promise<void> {
        const current = await this.getSettings();
        await this.set({ settings: { ...current, ...settings } });
    }

    // Diagram operations
    async getDiagrams(): Promise<Diagram[]> {
        const data = await this.get(['diagrams']);
        return data.diagrams || [];
    }

    async addDiagram(diagram: Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'>): Promise<Diagram> {
        const diagrams = await this.getDiagrams();
        const newDiagram: Diagram = {
            ...diagram,
            id: this.generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        diagrams.push(newDiagram);
        await this.set({ diagrams });
        await this.addRecentItem('diagram', newDiagram.id);
        return newDiagram;
    }

    async updateDiagram(id: string, updates: Partial<Diagram>): Promise<void> {
        const diagrams = await this.getDiagrams();
        const index = diagrams.findIndex((d) => d.id === id);
        if (index !== -1) {
            diagrams[index] = {
                ...diagrams[index],
                ...updates,
                updatedAt: Date.now(),
            };
            await this.set({ diagrams });
        }
    }

    async deleteDiagram(id: string): Promise<void> {
        const diagrams = await this.getDiagrams();
        const filtered = diagrams.filter((d) => d.id !== id);
        await this.set({ diagrams: filtered });
    }

    // Document operations
    async getDocuments(): Promise<Document[]> {
        const data = await this.get(['documents']);
        return data.documents || [];
    }

    async addDocument(doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
        const documents = await this.getDocuments();
        const newDoc: Document = {
            ...doc,
            id: this.generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        documents.push(newDoc);
        await this.set({ documents });
        await this.addRecentItem('document', newDoc.id);
        return newDoc;
    }

    async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
        const documents = await this.getDocuments();
        const index = documents.findIndex((d) => d.id === id);
        if (index !== -1) {
            documents[index] = {
                ...documents[index],
                ...updates,
                updatedAt: Date.now(),
            };
            await this.set({ documents });
        }
    }

    async deleteDocument(id: string): Promise<void> {
        const documents = await this.getDocuments();
        const filtered = documents.filter((d) => d.id !== id);
        await this.set({ documents: filtered });
    }

    // Recent items
    async getRecentItems(): Promise<Array<{ type: 'diagram' | 'document'; id: string }>> {
        const data = await this.get(['recentItems']);
        return data.recentItems || [];
    }

    private async addRecentItem(type: 'diagram' | 'document', id: string): Promise<void> {
        let recent = await this.getRecentItems();
        // Remove if already exists
        recent = recent.filter((item) => !(item.type === type && item.id === id));
        // Add to front
        recent.unshift({ type, id });
        // Keep only last 10
        recent = recent.slice(0, 10);
        await this.set({ recentItems: recent });
    }

    // Utility
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Clear all data
    async clear(): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                resolve();
            });
        });
    }
}

export default StorageManager.getInstance();
