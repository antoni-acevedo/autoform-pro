// Service Worker (Backdrop script)
console.log('[Extension Pro TS] Background Script Cargado');

if (typeof chrome !== 'undefined' && chrome.runtime) {
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

    // 1. Configurar comportamiento del SidePanel (Abrir al hacer clic)
    if (chrome.sidePanel) {
        chrome.sidePanel
          .setPanelBehavior({ openPanelOnActionClick: true })
          .catch((error) => console.error('[Background] Error al configurar sidePanel:', error));
    }

    // 2. Recrear menú contextual
    if (chrome.contextMenus) {
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
    }
}

export {};
