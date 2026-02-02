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
                theme: 'light',
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

// Handle action click (fallback for older Chrome versions or specific configs)
chrome.action.onClicked.addListener((tab) => {
    if (tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId })
            .catch(err => console.error('Failed to open side panel:', err));
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((
    message: Message,
    sender,
    sendResponse: (response: MessageResponse) => void
) => {
    console.log('Message received:', message.type, message.data);

    // Handle different message types
    handleMessage(message, sender)
        .then((response) => sendResponse(response))
        .catch((error) => {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true; // Keep channel open for async response
});

async function handleMessage(
    message: Message,
    sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
    switch (message.type) {
        case MessageType.GET_STORAGE:
            return handleGetStorage(message.data);

        case MessageType.SET_STORAGE:
            return handleSetStorage(message.data);

        case MessageType.ANALYZE_PAGE:
            return handleAnalyzePage(sender.tab?.id);

        case MessageType.ANALYZE_REPO:
            return handleAnalyzeRepo(message.data);

        default:
            return { success: false, error: 'Unknown message type' };
    }
}

async function handleGetStorage(keys: string[]): Promise<MessageResponse> {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (data) => {
            resolve({ success: true, data });
        });
    });
}

async function handleSetStorage(data: any): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
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

// Context menu integration
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'devcanvas-create-diagram',
        title: 'Create Diagram from Selection',
        contexts: ['selection'],
    });

    chrome.contextMenus.create({
        id: 'devcanvas-analyze-page',
        title: 'Analyze Current Page',
        contexts: ['page'],
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'devcanvas-create-diagram' && info.selectionText) {
        // Future: Open diagram creator with selected text
        console.log('Create diagram from:', info.selectionText);

        // Could send message to popup to open diagram editor
        chrome.runtime.sendMessage({
            type: MessageType.CREATE_DIAGRAM,
            data: { text: info.selectionText },
        });
    } else if (info.menuItemId === 'devcanvas-analyze-page' && tab?.id) {
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
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if it's a GitHub page
        if (tab.url.includes('github.com')) {
            console.log('GitHub page detected:', tab.url);
            // Future: Show page action or inject GitHub-specific features
        }
    }
});
