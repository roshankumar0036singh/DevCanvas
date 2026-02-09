// Message types for communication between extension components

export enum MessageType {
    // Storage operations
    GET_STORAGE = 'GET_STORAGE',
    SET_STORAGE = 'SET_STORAGE',

    // Diagram operations
    CREATE_DIAGRAM = 'CREATE_DIAGRAM',
    UPDATE_DIAGRAM = 'UPDATE_DIAGRAM',
    DELETE_DIAGRAM = 'DELETE_DIAGRAM',

    // Document operations
    CREATE_DOCUMENT = 'CREATE_DOCUMENT',
    UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
    DELETE_DOCUMENT = 'DELETE_DOCUMENT',

    // Content script operations
    ACTIVATE_OVERLAY = 'ACTIVATE_OVERLAY',
    ANALYZE_PAGE = 'ANALYZE_PAGE',

    // GitHub operations
    ANALYZE_REPO = 'ANALYZE_REPO',
    ANALYZE_README = 'ANALYZE_README',
    FETCH_PR_DIFF = 'FETCH_PR_DIFF',

    // Settings
    UPDATE_SETTINGS = 'UPDATE_SETTINGS',
}

export interface Message<T = unknown> {
    type: MessageType;
    data?: T;
    target?: 'content-script' | 'background' | 'popup';
}

export interface MessageResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// Helper function to send messages
export async function sendMessage<T = unknown, R = unknown>(
    message: Message<T>
): Promise<MessageResponse<R>> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response: MessageResponse<R>) => {
            if (chrome.runtime.lastError) {
                resolve({
                    success: false,
                    error: chrome.runtime.lastError.message,
                });
            } else {
                resolve(response);
            }
        });
    });
}

// Helper to send message to specific tab
export async function sendMessageToTab<T = unknown, R = unknown>(
    tabId: number,
    message: Message<T>
): Promise<MessageResponse<R>> {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<R>) => {
            if (chrome.runtime.lastError) {
                resolve({
                    success: false,
                    error: chrome.runtime.lastError.message,
                });
            } else {
                resolve(response);
            }
        });
    });
}
