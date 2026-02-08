/**
 * GitHub Service - Fetch repository data and READMEs
 */

export interface GitHubRepo {
    owner: string;
    repo: string;
    url: string;
}

/**
 * Parse GitHub URL to extract owner and repo
 */
export function parseGitHubUrl(url: string): GitHubRepo | null {
    const patterns = [
        /github\.com\/([^/]+)\/([^/]+)/,
        /github\.com\/([^/]+)\/([^/]+)\.git/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace('.git', ''),
                url: `https://github.com/${match[1]}/${match[2].replace('.git', '')}`,
            };
        }
    }

    return null;
}

/**
 * Fetch README content from GitHub repository
 */
export async function fetchReadme(owner: string, repo: string): Promise<string> {
    try {
        // Try README.md first
        const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        let response = await fetch(readmeUrl);

        // If main branch doesn't exist, try master
        if (!response.ok) {
            const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
            response = await fetch(masterUrl);
        }

        if (!response.ok) {
            throw new Error(`README not found (${response.status})`);
        }

        return await response.text();
    } catch (error: any) {
        console.error('Error fetching README:', error);
        throw new Error(`Failed to fetch README: ${error.message}`);
    }
}

/**
 * Fetch README from current tab's GitHub URL
 */
export async function fetchReadmeFromCurrentTab(): Promise<{ readme: string; repo: GitHubRepo }> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url) {
        throw new Error('No active tab URL');
    }

    const repo = parseGitHubUrl(tab.url);
    if (!repo) {
        throw new Error('Not a GitHub repository URL');
    }

    const readme = await fetchReadme(repo.owner, repo.repo);

    return { readme, repo };
}

/**
 * Get repository information from GitHub API
 */
export async function getRepoInfo(owner: string, repo: string): Promise<any> {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch repo info (${response.status})`);
        }

        return await response.json();
    } catch (error: any) {
        console.error('Error fetching repo info:', error);
        throw error;
    }
}

export default {
    parseGitHubUrl,
    fetchReadme,
    fetchReadmeFromCurrentTab,
    getRepoInfo,
};
