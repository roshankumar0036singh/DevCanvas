// Background service worker for DevCanvas extension

console.log('DevCanvas service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('DevCanvas installed');

        // Initialize storage
        chrome.storage.sync.set({
            settings: {
                theme: 'light',
                aiProvider: 'openai',
            },
            diagrams: [],
            documents: [],
        });
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message);

    switch (message.type) {
        case 'GET_STORAGE':
            chrome.storage.sync.get(message.keys, (data) => {
                sendResponse({ success: true, data });
            });
            return true; // Keep channel open for async response

        case 'SET_STORAGE':
            chrome.storage.sync.set(message.data, () => {
                sendResponse({ success: true });
            });
            return true;

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }
});

// Context menu integration (for future use)
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'devcanvas-create-diagram',
        title: 'Create Diagram',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'devcanvas-create-diagram') {
        // Future: Open diagram creator with selected text
        console.log('Create diagram from:', info.selectionText);
    }
});
