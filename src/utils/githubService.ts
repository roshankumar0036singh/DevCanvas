
export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

export class GitHubService {
    private token?: string;

    constructor(token?: string) {
        this.token = token;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
        };
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        return headers;
    }

    async fetchRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeItem[]> {
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (response.status === 403 || response.status === 429) {
            throw new RateLimitError('GitHub API Rate Limit Exceeded');
        }

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.tree; // Array of { path, mode, type, sha, size, url }
    }

    async fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
        // Use raw media type to get content directly
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const headers = this.getHeaders();
        // Request raw content
        headers['Accept'] = 'application/vnd.github.v3.raw';

        const response = await fetch(url, { headers });

        if (response.status === 403 || response.status === 429) {
            throw new RateLimitError('GitHub API Rate Limit Exceeded');
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${path}`);
        }

        return await response.text();
    }

    // Fallback using raw.githubusercontent.com (for public repos if API fails?) 
    // Actually API is better for private. But raw domain works for tokens too? 
    // Stick to API for consistency.
}

export interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
}
