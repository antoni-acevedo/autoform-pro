// Content Script
console.log('%c[Extension Pro TS] Content Script Cargado', 'color: #7c4dff; font-weight: bold;');

let isEnabled: boolean = true;
let clickCount: number = 0;

// 1. Cargar estado inicial
chrome.storage.local.get(['isEnabled', 'clicksCount'], (result) => {
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    clickCount = result.clicksCount || 0;
});

// 2. Escuchar mensajes del Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleState') {
        isEnabled = request.isEnabled;
        console.log(`[Extension Pro] Estado cambiado: ${isEnabled ? 'ON' : 'OFF'}`);
        return true;
    }

    if (request.action === 'runFeature') {
        if (!isEnabled) {
            sendResponse({ success: false, message: 'La extensión está desactivada' });
            return;
        }

        const elements = document.querySelectorAll('div, p, a, img');
        const count = elements.length;

        // Efecto visual
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; border: 4px solid #7c4dff; pointer-events: none; z-index: 999999; transition: opacity 1s; opacity: 1;';
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 1000); }, 500);

        sendResponse({ success: true, message: `¡Escaneado (TS)! Encontrados ${count} elementos.`, count: count });
        chrome.storage.local.set({ elementsFound: count });
    }
});

// 3. Capturar clicks
document.addEventListener('click', () => {
    if (!isEnabled) return;
    clickCount++;
    chrome.storage.local.set({ clicksCount: clickCount });
    chrome.runtime.sendMessage({ action: 'updateStats', clicks: clickCount }).catch(() => {});
});

export {};
