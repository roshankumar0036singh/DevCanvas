// Enhanced background service worker for DevCanvas extension
import { MessageType, type Message, type MessageResponse } from '../utils/messaging';

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
            handleGetStorage(message.data).then(sendResponse);
            return true;

        case MessageType.FETCH_PR_DIFF:
        case 'FETCH_PR_DIFF':
            handleFetchPullRequestDiff(message.data?.url).then(sendResponse);
            return true;

        case MessageType.SET_STORAGE:
        case 'SET_STORAGE':
            handleSetStorage(message.data).then(sendResponse);
            return true;

        case MessageType.ANALYZE_PAGE:
        case 'ANALYZE_PAGE':
            handleAnalyzePage(sender.tab?.id || message.data?.tabId).then(sendResponse);
            return true;

        case MessageType.ANALYZE_REPO:
        case 'ANALYZE_REPO':
            handleAnalyzeRepo(message.data).then(sendResponse);
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

async function handleSetStorage(data: any): Promise<MessageResponse> {
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
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function handleAnalyzeRepo(repoUrl: string): Promise<MessageResponse> {
    // Future: Implement GitHub repository analysis
    console.log('Analyzing repository:', repoUrl);
    return {
        success: true,
        data: { message: 'Repository analysis not yet implemented' },
    };
}

async function handleFetchPullRequestDiff(prUrl?: string): Promise<MessageResponse> {
    if (!prUrl) {
        return { success: false, error: 'No PR URL provided' };
    }

    console.log('DevCanvas: Background fetching PR diff for:', prUrl);

    // Clean URL and append .diff
    const diffUrl = prUrl.split('?')[0].split('#')[0].replace(/\/$/, '') + '.diff';

    try {
        const response = await fetch(diffUrl);
        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'PR diff not found. Is this a private repository or invalid URL?' };
            }
            return { success: false, error: `Failed to fetch diff: ${response.statusText}` };
        }

        const diff = await response.text();
        console.log('DevCanvas: PR diff fetched successfully by background, length:', diff.length);

        // Truncate if too large for messaging limits (though diffs are usually okay, 500k is a safe bet)
        const output = diff.length > 500000
            ? diff.slice(0, 500000) + '\n\n... (Diff truncated due to size)'
            : diff;

        return { success: true, data: output };
    } catch (error: any) {
        console.error('DevCanvas: Background error fetching PR diff:', error);
        return { success: false, error: `Background fetch failed: ${error.message}` };
    }
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
        // Future: Open diagram creator with selected text
        console.log('Create diagram from:', info.selectionText);

        // Could send message to popup to open diagram editor
        chrome.runtime.sendMessage({
            type: MessageType.CREATE_DIAGRAM,
            data: { text: info.selectionText },
            target: 'popup',
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
