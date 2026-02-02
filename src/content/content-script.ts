// Content script for DevCanvas extension

console.log('DevCanvas content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    switch (message.type) {
        case 'ACTIVATE_OVERLAY':
            activateOverlay();
            sendResponse({ success: true });
            break;

        case 'ANALYZE_PAGE':
            const pageData = analyzePage();
            sendResponse({ success: true, data: pageData });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true;
});

// Activate diagram overlay on current page
function activateOverlay() {
    console.log('Activating overlay...');
    // Future: Inject overlay UI
}

// Analyze current page for relevant content
function analyzePage() {
    return {
        url: window.location.href,
        title: document.title,
        isGitHub: window.location.hostname.includes('github.com'),
    };
}

// Keyboard shortcut listener (Ctrl+Shift+D to activate)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        activateOverlay();
    }
});
