import { MessageType, type Message, type MessageResponse } from '../utils/messaging';

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
    const handleAsync = async (promise: Promise<any>) => {
        try {
            const result = await promise;
            sendResponse({ success: true, data: result });
        } catch (error: any) {
            console.error(`DevCanvas: Error handling ${message.type}:`, error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
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
}

async function analyzePage() {
    console.log('DevCanvas: analyzePage called');
    const isGitHub = window.location.hostname.includes('github.com');
    let diagram = null;

    if (isGitHub) {
        const result = await analyzeGitHubRepo() as any;
        // Handle legacy string return or new object return
        if (typeof result === 'string') {
            diagram = result;
        } else {
            diagram = result.diagram;
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
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn(`DevCanvas: Fetch timed out for ${filename} on ${branch}`);
            }
            // Try next branch
        } finally {
            clearTimeout(timeoutId);
        }
    }
    return null;
}

async function analyzeGitHubRepo() {
    console.log('DevCanvas: ===== STARTING ANALYSIS =====');
    console.log('DevCanvas: URL:', window.location.href);

    const structure: { name: string; type: 'file' | 'dir' }[] = [];
    const pathParts = window.location.pathname.split('/').filter(Boolean);

    console.log('DevCanvas: Path parts:', pathParts);

    if (pathParts.length < 2) {
        console.log('DevCanvas: ERROR - Not a valid repo URL');
        return `graph TD\n    error[Invalid repo URL]\n    style error fill:#fee,stroke:#f00`;
    }

    const user = pathParts[0];
    const repo = pathParts[1];
    const repoBase = `/${user}/${repo}`;

    console.log('DevCanvas: Repo base:', repoBase);

    // Get all links on page
    const allLinks = document.getElementsByTagName('a');
    console.log('DevCanvas: Total links on page:', allLinks.length);

    const processedMap = new Map<string, 'file' | 'dir'>();
    let blobCount = 0;
    let treeCount = 0;
    let matchedCount = 0;

    for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];
        const href = link.href;
        const text = link.textContent?.trim();

        if (!href || !text) continue;
        if (!href.includes(repoBase)) continue;

        // Determine type based on URL pattern
        let type: 'file' | 'dir' | null = null;
        if (href.includes('/blob/')) {
            type = 'file';
            blobCount++;
        } else if (href.includes('/tree/')) {
            type = 'dir';
            treeCount++;
        }

        if (!type) continue;
        if (text === '..') continue;

        // RELAXED matching - accept any reasonable text
        if (text.length > 0 && text.length < 100 && !text.includes('\n')) {
            if (!processedMap.has(text)) {
                processedMap.set(text, type);
                matchedCount++;
                if (matchedCount <= 5) {
                    console.log(`DevCanvas: Matched "${text}" as ${type}`);
                }
            }
        }
    }

    console.log('DevCanvas: Blob links found:', blobCount);
    console.log('DevCanvas: Tree links found:', treeCount);
    console.log('DevCanvas: Unique items matched:', processedMap.size);

    processedMap.forEach((type, name) => {
        structure.push({ name, type });
    });

    console.log('DevCanvas: Final structure length:', structure.length);

    if (structure.length === 0) {
        console.log('DevCanvas: ERROR - No files detected!');
        return `graph TD\n    error[No files detected]\n    info[Found ${blobCount} blob + ${treeCount} tree links]\n    hint[Check DevTools Console]\n    style error fill:#fee,stroke:#f00`;
    }

    console.log('DevCanvas: Generating Mermaid diagram...');
    const diagram = generateMermaidTree(structure);
    console.log('DevCanvas: Diagram generated, length:', diagram.length);

    // Fetch extra context for deeper analysis
    let extraContext = '';
    // Common configuration and entry files to fetch proactively
    const importantFiles = [
        'README.md', 'package.json', 'requirements.txt', 'go.mod', 'pom.xml', 'build.gradle',
        'index.html', 'manifest.json', 'Dockerfile', 'docker-compose.yml', 'tsconfig.json',
        // Common Source Entry Points (Probe these even if not visible in root)
        'src/index.css', 'src/styles.css', 'src/global.css', 'src/App.css',
        'src/index.js', 'src/index.ts', 'src/index.tsx', 'src/index.jsx',
        'src/main.js', 'src/main.ts', 'src/main.tsx', 'src/main.go', 'src/main.rs',
        'src/App.js', 'src/App.tsx', 'src/App.vue', 'src/App.jsx'
    ];

    // Identify source files for Deep Analysis
    const sourceExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.sh', '.go', '.rb', '.java', '.c', '.cpp', '.h', '.html', '.css', '.json', '.yaml', '.yml', '.sql', '.rs', '.php'];

    // Sort items to prioritize interesting files (e.g. controllers, services, styles)
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
        !importantFiles.includes(i.name) // Avoid duplicates
    ).slice(0, 12); // Increased from 7 to 12

    // Check for issue templates in the structure
    const templateKeywords = ['issue_template', 'bug_report', 'feature_request', 'template'];
    // Use original structure for templates as they are usually in root or .github
    const templateFiles = structure.filter(i =>
        i.type === 'file' &&
        templateKeywords.some(kw => i.name.toLowerCase().includes(kw)) &&
        !i.name.toLowerCase().includes('pull_request')
    ).slice(0, 3);

    const filesToFetch = [
        ...importantFiles.map(f => ({ name: f, tag: 'FILE' })),
        ...templateFiles.map(f => ({ name: f.name, tag: 'ISSUE_TEMPLATE' })),
        ...sourceFiles.map(f => ({ name: f.name, tag: 'SOURCE_CODE' }))
    ].filter(f => structure.some(s => s.name === f.name));

    console.log(`DevCanvas: Fetching ${filesToFetch.length} files for context in parallel...`);

    // Fetch in parallel with limit if needed (here we have ~10-15 files max, parallel is fine)
    const fetchPromises = filesToFetch.map(async (file) => {
        const content = await fetchRepoFile(user, repo, file.name);
        if (content) {
            return `\n--- CONTENT OF ${file.tag} (${file.name}) ---\n${content.slice(0, 6000)}\n`;
        }
        return '';
    });

    const results = await Promise.all(fetchPromises);
    extraContext = results.join('');

    console.log('DevCanvas: Extra context gathered, length:', extraContext.length);

    return {
        structure,
        diagram,
        extraContext
    };
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
    } catch (error: any) {
        console.error('DevCanvas: Error fetching README:', error);
        throw new Error(`Failed to fetch README: ${error.message}`);
    }
}

// --- Keyboard Shortcut ---

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        activateOverlay();
    }
});
