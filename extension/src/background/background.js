let currentState = {
    roomCode: null,
    isHost: false,
    clientId: null
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    switch (message.type) {
        case 'GET_EXTENSION_STATE':
            sendResponse(currentState);
            break;

        case 'UPDATE_EXTENSION_STATE':
            currentState = { ...currentState, ...message.state };
            chrome.storage.local.set(currentState);
            sendResponse({ success: true });
            break;

        case 'CLEAR_EXTENSION_STATE':
            currentState = {
                roomCode: null,
                isHost: false,
                clientId: null
            };
            chrome.storage.local.clear();
            sendResponse({ success: true });
            break;
    }
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['roomCode', 'isHost', 'clientId'], (result) => {
        if (result) {
            currentState = {
                roomCode: result.roomCode || null,
                isHost: result.isHost || false,
                clientId: result.clientId || null
            };
        }
    });
});

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
