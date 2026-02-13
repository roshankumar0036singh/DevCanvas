import { MessageType, type Message, type MessageResponse } from '../utils/messaging';

import { createRoot } from 'react-dom/client';
import Overlay from './Overlay';
import './overlay.css';

console.log('DevCanvas content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
    // List of message types that we KNOW are for the content script
    const contentScriptTypes = [
        MessageType.ACTIVATE_OVERLAY,
        MessageType.ANALYZE_PAGE,
        MessageType.ANALYZE_REPO,
        MessageType.ANALYZE_README,
    ];

    // If it has a target and it's not us, ignore it
    if (message.target && message.target !== 'content-script') {
        return false;
    }

    // If it's not one of our known types, ignore it
    if (!contentScriptTypes.includes(message.type)) {
        return false;
    }

    console.log('DevCanvas: Content script handling message:', message.type);

    // Wrapper for async handlers to ensure response is sent
    const handleAsync = async (promise: Promise<unknown>) => {
        try {
            const result = await promise;
            sendResponse({ success: true, data: result });
        } catch (error: unknown) {
            console.error(`DevCanvas: Error handling ${message.type}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
        }
    };

    switch (message.type) {
        case MessageType.ACTIVATE_OVERLAY:
            activateOverlay();
            sendResponse({ success: true });
            return false;

        case MessageType.ANALYZE_PAGE:
            handleAsync(analyzePage());
            return true;

        case MessageType.ANALYZE_REPO:
            handleAsync(analyzeGitHubRepo());
            return true;

        case MessageType.ANALYZE_README:
            handleAsync(analyzeReadme());
            return true;

        default:
            return false;
    }
});

function activateOverlay() {
    console.log('Activating overlay...');
    const existingRoot = document.getElementById('devcanvas-overlay-root');

    if (existingRoot) {
        // Toggle visibility if already exists
        const currentDisplay = existingRoot.style.display;
        existingRoot.style.display = currentDisplay === 'none' ? 'block' : 'none';
        return;
    }

    // Create container
    const rootDiv = document.createElement('div');
    rootDiv.id = 'devcanvas-overlay-root';
    rootDiv.className = 'devcanvas-root'; // Scope styles
    document.body.appendChild(rootDiv);

    // Mount React App
    const root = createRoot(rootDiv);
    root.render(
        <div className="devcanvas-root">
            <Overlay onClose={() => {
                rootDiv.style.display = 'none';
            }} />
        </div>
    );
}

async function analyzePage() {
    console.log('DevCanvas: analyzePage called');
    const isGitHub = window.location.hostname.includes('github.com');
    let diagram = null;

    if (isGitHub) {
        const result = await analyzeGitHubRepo();
        // Handle legacy string return or new object return
        if (typeof result === 'string') {
            diagram = result;
        } else if (result && typeof result === 'object' && 'diagram' in result) {
            diagram = (result as { diagram: string }).diagram;
        }
        console.log('DevCanvas: Generated diagram:', diagram ? 'YES' : 'NO');
    }

    return {
        url: window.location.href,
        title: document.title,
        isGitHub,
        diagram
    };
}

// --- GitHub Analysis Logic ---
async function fetchRepoFile(owner: string, repo: string, filename: string): Promise<string | null> {
    const branches = ['main', 'master', 'dev'];

    for (const branch of branches) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per attempt

        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
        try {
            const resp = await fetch(url, { signal: controller.signal });
            if (resp.ok) {
                clearTimeout(timeoutId);
                return await resp.text();
            }
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') {
                console.warn(`DevCanvas: Fetch timed out for ${filename} on ${branch}`);
            }
            // Try next branch
        } finally {
            clearTimeout(timeoutId);
        }
    }
    return null;
}


import { GitHubService, RateLimitError } from '../utils/githubService';
import StorageManager from '../utils/storage';

async function getBranch(user: string, repo: string, token?: string): Promise<string> {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    // URL: /user/repo/tree/branch/... or /user/repo/blob/branch/...
    if (pathParts.length >= 4 && (pathParts[2] === 'tree' || pathParts[2] === 'blob')) {
        return pathParts[3];
    }

    // Default branch from API
    try {
        // We need a method to get repo details? Or just guess main/master?
        // Let's add getRepoDetails to service or fetch manually here for simplicity
        const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        const resp = await fetch(`https://api.github.com/repos/${user}/${repo}`, { headers });
        if (resp.ok) {
            const data = await resp.json();
            return data.default_branch || 'main';
        }
    } catch (e) {
        console.warn('DevCanvas: Failed to fetch default branch', e);
    }
    return 'main';
}

async function analyzeGitHubRepo() {
    console.log('DevCanvas: ===== STARTING ANALYSIS =====');
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) return `graph TD\n    error[Invalid repo URL]`;

    const user = pathParts[0];
    const repo = pathParts[1];

    // Check for Token
    const settings = await StorageManager.getSettings();
    const token = settings.githubToken;
    let structure: { name: string; type: 'file' | 'dir' }[] = [];
    let usedApi = false;
    let ghService: GitHubService | null = null;

    if (token) {
        try {
            console.log('DevCanvas: Using GitHub API with Token');
            ghService = new GitHubService(token);
            const branch = await getBranch(user, repo, token);
            const tree = await ghService.fetchRepoTree(user, repo, branch);

            structure = tree.map((item: { path: string; type: string }) => ({
                name: item.path,
                type: item.type === 'blob' ? 'file' : 'dir'
            }));
            usedApi = true;
            console.log(`DevCanvas: Fetched ${structure.length} items from API`);
        } catch (e) {
            console.error('DevCanvas: API Error', e);
            if (e instanceof RateLimitError) {
                return { error: 'RATE_LIMIT' };
            }
            // Fallback to DOM if API fails (e.g. 404, Network)
            console.log('DevCanvas: Falling back to DOM Scraping');
        }
    }

    if (!usedApi) {
        // --- Original DOM Scraping Logic ---
        const repoBase = `/${user}/${repo}`;
        const allLinks = document.getElementsByTagName('a');
        const processedMap = new Map<string, 'file' | 'dir'>();

        for (let i = 0; i < allLinks.length; i++) {
            const link = allLinks[i];
            const href = link.getAttribute('href');
            const text = link.textContent?.trim(); // Use text content as name? No, use href path relative to repo

            if (!href || !text) continue;
            // Only capture items that are inside the repo blob/tree
            if (!href.startsWith(repoBase)) continue;

            // Logic to extract clean path from href
            // href: /user/repo/blob/main/src/index.ts -> src/index.ts
            // href: /user/repo/tree/main/src -> src

            let type: 'file' | 'dir' | null = null;
            if (href.includes('/blob/')) type = 'file';
            else if (href.includes('/tree/')) type = 'dir';

            if (!type) continue;

            // Extract relative path
            // parts: ['', user, repo, blob|tree, branch, ...path]
            const parts = href.split('/').filter(Boolean);
            if (parts.length < 5) continue; // Must have path after branch

            const relativePath = parts.slice(4).join('/');
            if (relativePath && !processedMap.has(relativePath)) {
                processedMap.set(relativePath, type);
            }
        }

        processedMap.forEach((type, name) => structure.push({ name, type }));
    }

    if (structure.length === 0) {
        return `graph TD\n    error[No files detected]`;
    }

    const diagram = generateMermaidTree(structure);

    // Context Fetching (Updated to use API if available)
    let extraContext = '';


    const importantFiles = [
        'README.md', 'package.json', 'requirements.txt', 'go.mod', 'pom.xml', 'build.gradle',
        'index.html', 'manifest.json', 'Dockerfile', 'docker-compose.yml', 'tsconfig.json',
        'src/index.css', 'src/styles.css', 'src/global.css', 'src/App.css',
        'src/index.js', 'src/index.ts', 'src/index.tsx', 'src/index.jsx',
        'src/main.js', 'src/main.ts', 'src/main.tsx', 'src/main.go', 'src/main.rs',
        'src/App.js', 'src/App.tsx', 'src/App.vue', 'src/App.jsx'
    ];

    // ... (sorting and slicing) ...
    const sourceExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.sh', '.go', '.rb', '.java', '.c', '.cpp', '.h', '.html', '.css', '.json', '.yaml', '.yml', '.sql', '.rs', '.php'];

    const sortedStructure = [...structure].sort((a, b) => {
        const priorityScore = (name: string) => {
            name = name.toLowerCase();
            if (name.includes('config')) return 10;
            if (name.includes('service')) return 8;
            if (name.includes('controller')) return 8;
            if (name.includes('util')) return 6;
            if (name.includes('hook')) return 6;
            if (name.includes('type')) return 5;
            return 0;
        };
        return priorityScore(b.name) - priorityScore(a.name);
    });

    const sourceFiles = sortedStructure.filter(i =>
        i.type === 'file' &&
        sourceExtensions.some(ext => i.name.toLowerCase().endsWith(ext)) &&
        !importantFiles.includes(i.name)
    ).slice(0, 12);

    const templateKeywords = ['issue_template', 'bug_report', 'feature_request', 'template'];
    const templateFiles = structure.filter(i =>
        i.type === 'file' &&
        templateKeywords.some(kw => i.name.toLowerCase().includes(kw)) &&
        !i.name.toLowerCase().includes('pull_request')
    ).slice(0, 3);

    const filesToFetch = [
        ...importantFiles.map(f => ({ name: f, tag: 'FILE' })),
        ...templateFiles.map(f => ({ name: f.name, tag: 'ISSUE_TEMPLATE' })),
        ...sourceFiles.map(f => ({ name: f.name, tag: 'SOURCE_CODE' }))
    ].filter(f => structure.some(s => s.name === f.name) || importantFiles.includes(f.name));
    // ^ Allow importantFiles to be fetched even if not in structure (if using API, structure has ALL files. If scraping, maybe not).
    // If API used, structure has everything.
    // If scraping used, structure has only visible. use `fetchRepoFile` for important (proactive).

    console.log(`DevCanvas: Fetching ${filesToFetch.length} files...`);

    // ghService is already initialized if token exists

    const fetchPromises = filesToFetch.map(async (file) => {
        try {
            let content = '';
            if (ghService) {
                try {
                    content = await ghService.fetchFileContent(user, repo, file.name);
                } catch (e) {
                    // Fallback to raw if API fails or 404
                    content = (await fetchRepoFile(user, repo, file.name)) || '';
                }
            } else {
                content = (await fetchRepoFile(user, repo, file.name)) || '';
            }

            if (content) return `\n--- CONTENT OF ${file.tag} (${file.name}) ---\n${content.slice(0, 8000)}\n`;
        } catch (e) {
            console.warn(`Failed to fetch ${file.name}`, e);
        }
        return '';
    });

    const results = await Promise.all(fetchPromises);
    extraContext = results.join('');

    return { structure, diagram, extraContext };
}


function generateMermaidTree(items: { name: string; type: 'file' | 'dir' }[]) {
    if (items.length === 0) return '';

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const repoName = pathParts[1] || 'Repository';

    let mermaidCode = `graph TD\n    root[${repoName}]\n`;
    const maxItems = 30;
    const processItems = items.slice(0, maxItems);

    processItems.forEach((item, index) => {
        const nodeId = `node${index}`;
        const label = item.name.replace(/["[\]()]/g, '');

        if (item.type === 'dir') {
            mermaidCode += `    root --> ${nodeId}["📂 ${label}"]\n`;
            mermaidCode += `    style ${nodeId} fill:#2A313C,stroke:#00DC82,stroke-width:2px,color:#fff\n`;
        } else {
            mermaidCode += `    root --> ${nodeId}["📄 ${label}"]\n`;
            mermaidCode += `    style ${nodeId} fill:#151A23,stroke:#2D333B,stroke-width:1px,color:#949DA5\n`;
        }
    });

    if (items.length > maxItems) {
        mermaidCode += `    root --> more[... ${items.length - maxItems} more files]\n`;
    }

    return mermaidCode;
}

// --- README Analysis Logic ---

async function analyzeReadme(): Promise<{ readme: string; repoName: string }> {
    console.log('DevCanvas: analyzeReadme called');

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
        throw new Error('Not a valid GitHub repository URL');
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const repoName = `${owner}/${repo}`;

    console.log('DevCanvas: Fetching README for:', repoName);

    try {
        // Try main branch first
        let readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        let response = await fetch(readmeUrl);

        // If main doesn't exist, try master
        if (!response.ok) {
            readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
            response = await fetch(readmeUrl);
        }

        if (!response.ok) {
            throw new Error(`README not found (${response.status})`);
        }

        const readme = await response.text();
        console.log('DevCanvas: README fetched successfully, length:', readme.length);

        return { readme, repoName };
    } catch (error: unknown) {
        console.error('DevCanvas: Error fetching README:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch README: ${errorMessage}`);
    }
}

// --- Keyboard Shortcut ---

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        activateOverlay();
    }
});
