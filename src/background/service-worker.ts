// Enhanced background service worker for DevCanvas extension
import { MessageType, type Message, type MessageResponse } from '../utils/messaging';
import { type Settings } from '../utils/storage';

console.log('DevCanvas service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('DevCanvas installed');

        // Initialize storage with default settings
        chrome.storage.sync.set({
            settings: {
                theme: 'dark',
                aiProvider: 'openai',
                autoSync: true,
                defaultDiagramType: 'mermaid',
            },
            diagrams: [],
            documents: [],
            recentItems: [],
        });

        // Open welcome page (future)
        // chrome.tabs.create({ url: 'welcome.html' });

        // Set side panel behavior
        // This allows the side panel to open when clicking the action icon
        if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
            chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
                .catch(err => console.error('Failed to set panel behavior:', err));
        }
    } else if (details.reason === 'update') {
        console.log('DevCanvas updated to version', chrome.runtime.getManifest().version);
    }
});

// Note: chrome.action.onClicked is not used when side panel is configured
// The side panel opens automatically via setPanelBehavior above

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((
    message: Message,
    sender,
    sendResponse: (response: MessageResponse) => void
) => {
    // List of message types that we KNOW are for the background script
    const backgroundTypes = [
        MessageType.GET_STORAGE,
        MessageType.SET_STORAGE,
        MessageType.ANALYZE_PAGE,
        MessageType.ANALYZE_REPO,
        MessageType.UPDATE_SETTINGS,
        MessageType.FETCH_PR_DIFF,
        'GET_STORAGE',
        'SET_STORAGE',
        'ANALYZE_PAGE',
        'ANALYZE_REPO',
        'UPDATE_SETTINGS',
        'FETCH_PR_DIFF'
    ];

    // Explicitly known but handled elsewhere (content script)
    const contentScriptTypes = [
        MessageType.ACTIVATE_OVERLAY,
        MessageType.ANALYZE_README,
        MessageType.FETCH_PR_DIFF,
        'ACTIVATE_OVERLAY',
        'ANALYZE_README',
        'FETCH_PR_DIFF'
    ];

    // If it has a target and it's not us, ignore it silently
    if (message.target && message.target !== 'background') {
        return false;
    }

    // If it's not one of our known types, check if it's for content script
    if (!backgroundTypes.includes(message.type as string)) {
        // If it's for the content script, we definitely skip it
        if (contentScriptTypes.includes(message.type as string)) {
            return false;
        }

        // If it's completely unknown, we still skip it silently in the background
        // to avoid clashing with other extension components or future updates.
        return false;
    }

    const type = message.type as string;
    console.log('DevCanvas: Background handling message:', type);

    switch (type) {
        case MessageType.GET_STORAGE:
        case 'GET_STORAGE':
            handleGetStorage(message.data as string[]).then(sendResponse);
            return true;

        case MessageType.FETCH_PR_DIFF:
        case 'FETCH_PR_DIFF':
            handleFetchPullRequestDiff((message.data as { url: string })?.url).then(sendResponse);
            return true;

        case MessageType.SET_STORAGE:
        case 'SET_STORAGE':
            handleSetStorage(message.data as Record<string, unknown>).then(sendResponse);
            return true;

        case MessageType.ANALYZE_PAGE:
        case 'ANALYZE_PAGE':
            handleAnalyzePage(sender.tab?.id || (message.data as { tabId?: number })?.tabId).then(sendResponse);
            return true;

        case MessageType.ANALYZE_REPO:
        case 'ANALYZE_REPO':
            handleAnalyzeRepo(message.data as string).then(sendResponse);
            return true;

        default:
            return false;
    }
});


async function handleGetStorage(keys: string[]): Promise<MessageResponse> {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (data) => {
            resolve({ success: true, data });
        });
    });
}

async function handleSetStorage(data: Record<string, unknown>): Promise<MessageResponse> {
    return new Promise((resolve) => {
        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                resolve({ success: true });
            }
        });
    });
}

async function handleAnalyzePage(tabId?: number): Promise<MessageResponse> {
    if (!tabId) {
        return { success: false, error: 'No tab ID provided' };
    }

    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            type: MessageType.ANALYZE_PAGE,
            target: 'content-script',
        });
        return { success: true, data: response };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

async function handleAnalyzeRepo(repoUrl: string): Promise<MessageResponse> {
    console.log('Analyzing repository:', repoUrl);

    try {
        // Parse owner/repo from URL
        // Supported formats: github.com/owner/repo, https://github.com/owner/repo
        const match = repoUrl.match(new RegExp('github\\.com\\/([^/]+)\\/([^/]+)'));
        if (!match) {
            return { success: false, error: 'Invalid GitHub URL' };
        }
        const owner = match[1];
        const repo = match[2].replace('.git', ''); // clean .git extension
        const branch = 'main'; // simplified, ideally detect default branch

        // Get token
        const { settings } = await new Promise<{ settings?: Settings }>((resolve) => {
            chrome.storage.sync.get('settings', resolve);
        });
        const token = settings?.githubToken;

        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        const response = await fetch(url, { headers });

        if (response.status === 403 || response.status === 429) {
            return { success: false, error: 'GitHub API Rate Limit Exceeded' };
        }

        if (!response.ok) {
            // Try 'master' branch if main fails
            if (branch === 'main' && response.status === 404) {
                const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
                const masterResponse = await fetch(masterUrl, { headers });
                if (masterResponse.ok) {
                    const data = await masterResponse.json();
                    return { success: true, data: data.tree };
                }
            }
            return { success: false, error: `GitHub API Error: ${response.status}` };
        }

        const data = await response.json();
        return { success: true, data: data.tree };

    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

async function handleFetchPullRequestDiff(prUrl?: string): Promise<MessageResponse> {
    if (!prUrl) {
        return { success: false, error: 'No PR URL provided' };
    }

    console.log('DevCanvas: Background fetching PR diff for:', prUrl);

    // Clean URL and append .diff
    const diffUrl = prUrl.split('?')[0].split('#')[0].replace(/\/$/, '') + '.diff';

    try {
        // Get token from settings
        const { settings } = await new Promise<{ settings?: Settings }>((resolve) => {
            chrome.storage.sync.get('settings', resolve);
        });

        const token = settings?.githubToken;
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3.diff'
        };

        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        const response = await fetch(diffUrl, { headers });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'PR diff not found. Is this a private repository or invalid URL?' };
            }
            // Fallback: If 406 Not Acceptable (sometimes happens with raw diff endpoint), try without header
            if (response.status === 406) {
                const fallbackResponse = await fetch(diffUrl); // Retry without auth/accept
                if (fallbackResponse.ok) {
                    const diff = await fallbackResponse.text();
                    return { success: true, data: truncateDiff(diff) };
                }
            }

            return { success: false, error: `Failed to fetch diff: ${response.status} ${response.statusText}` };
        }

        const diff = await response.text();
        console.log('DevCanvas: PR diff fetched successfully by background, length:', diff.length);

        return { success: true, data: truncateDiff(diff) };
    } catch (error: unknown) {
        console.error('DevCanvas: Background error fetching PR diff:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Background fetch failed: ${errorMessage}` };
    }
}

function truncateDiff(diff: string): string {
    return diff.length > 500000
        ? diff.slice(0, 500000) + '\n\n... (Diff truncated due to size)'
        : diff;
}

// Context menu integration
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'DevCanvas-create-diagram',
        title: 'Create Diagram from Selection',
        contexts: ['selection'],
    });

    chrome.contextMenus.create({
        id: 'DevCanvas-analyze-page',
        title: 'Analyze Current Page',
        contexts: ['page'],
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'DevCanvas-create-diagram' && info.selectionText) {
        console.log('Create diagram from:', info.selectionText);

        // Store the selection so popup can pick it up when opened
        chrome.storage.local.set({
            pendingDiagramInput: info.selectionText,
            pendingDiagramTimestamp: Date.now()
        }, () => {
            // If side panel is available, open it
            if (chrome.sidePanel && chrome.sidePanel.open && tab?.windowId) {
                chrome.sidePanel.open({ windowId: tab.windowId })
                    .catch(e => console.error('Failed to open side panel:', e));
            }
        });

    } else if (info.menuItemId === 'DevCanvas-analyze-page' && tab?.id) {
        handleAnalyzePage(tab.id);
    }
});

// Keyboard command handling (future)
chrome.commands?.onCommand.addListener((command) => {
    console.log('Command received:', command);

    switch (command) {
        case 'activate-overlay':
            // Send message to content script to activate overlay
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: MessageType.ACTIVATE_OVERLAY,
                        target: 'content-script',
                    });
                }
            });
            break;
    }
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('Storage changed:', areaName, changes);

    // Future: Sync to cloud backend if autoSync is enabled
});

// Handle tab updates (for GitHub integration)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Detect GitHub pages and report URL changes (GitHub uses Pjax/SPAs)
    if ((changeInfo.status === 'complete' || changeInfo.url) && tab.url?.includes('github.com')) {
        console.log('DevCanvas: GitHub page update detected:', tabId, tab.url);

        // We could send a message to the content script or popup to refresh state
        // For now, let's just log it clearly to help verify detections
        if (tab.url.includes('/pull/') && changeInfo.status === 'complete') {
            console.log('DevCanvas: PR page detected and loaded:', tab.url);
        }
    }
});
