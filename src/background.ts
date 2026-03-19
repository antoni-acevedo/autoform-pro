// Service Worker (Backdrop script)
console.log('[Extension Pro TS] Background Script Cargado');

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Extension Pro] Extensión instalada.');
        chrome.storage.local.set({
            isEnabled: true,
            clicksCount: 0,
            elementsFound: 0
        });
    }
});

// Recrear menú contextual
chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
        id: 'scan-page',
        title: 'Escanear Página (TS)',
        contexts: ['all']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'scan-page' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'runFeature' });
    }
});

export {}; // Fuerza para considerarse módulo en TS
