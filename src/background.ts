/**
 * 🧠 BACKGROUND SCRIPT (Service Worker)
 * -------------------------------------
 * Este archivo corre en segundo plano en el navegador en un hilo separado.
 * Es el "cerebro" o servidor local de tu extensión. 
 * 
 * CARACTERÍSTICAS:
 * - No tiene acceso al DOM de las páginas (no puede leer botones o inputs directos).
 * - Controla APIs globales de Chrome (SidePanel, ContextMenus, Tabs, Alarmas).
 * - Se duerme cuando no está en uso para ahorrar RAM (arquitectura Manifest V3).
 */

console.log('[Extension Pro TS] Background Script Cargado');

// ==========================================
// 1. EVENTO DE INSTALACIÓN / ACTUALIZACIÓN
// ==========================================
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onInstalled.addListener((details) => {
        /**
         * Se lanza solo en 3 ocasiones:
         * - 'install': Primera vez que el usuario carga la extensión.
         * - 'update': Si cambias el "version" en el manifest.json.
         * - 'browser_update': Si se actualizó el propio Google Chrome.
         */
        if (details.reason === 'install') {
            console.log('[Extension Pro] Extensión instalada por primera vez.');
            
            // Inicializar estados o base de datos local predeterminada
            chrome.storage.local.set({
                isEnabled: true,
                clicksCount: 0,
                elementsFound: 0
            });
        }
    });

    // ==========================================
    // 2. CONFIGURACIÓN DEL SIDEPANEL
    // ==========================================
    if (chrome.sidePanel) {
        /**
         * setPanelBehavior: Le dice a Chrome que cuando el usuario haga CLIC
         * directamente sobre el icono de la extensión en la barra de herramientas,
         * en lugar de abrir un popup flotante, abra la barra lateral (SidePanel).
         */
        chrome.sidePanel
          .setPanelBehavior({ openPanelOnActionClick: true })
          .catch((error) => console.error('[Background] Error al configurar sidePanel:', error));
    }

    // ==========================================
    // 3. MENÚS CONTEXTUALES (CLIC DERECHO)
    // ==========================================
    if (chrome.contextMenus) {
        /**
         * removeAll: Limpia menús anteriores para evitar errores de "ID duplicado"
         * cuando el script se recarga (HMR).
         */
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: 'scan-page',
                title: 'Escanear Página (TS)', // Texto que verá el usuario
                contexts: ['all']           // 'all' significa que saldrá en cualquier clic derecho
            });
        });

        /**
         * onClicked: Escucha cuando el usuario hace clic sobre el menú que creamos arriba.
         */
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'scan-page' && tab?.id) {
                // background $\rightarrow$ content.js: Enviamos orden de escanear inputs
                chrome.tabs.sendMessage(tab.id, { action: 'runFeature' });
            }
        });
    }
}

// ==========================================
// 4. AUTOLOAD DE FONDO (WORKER MODE)
// ==========================================
// Soporta la inyección de la biblioteca al cambiar de pestaña o URL sin requerir el SidePanel Abierto.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active) {
        chrome.storage.local.get(['autoLoadPref', 'runInBackgroundPref', 'fields'], (res) => {
            if (res.runInBackgroundPref && res.autoLoadPref && res.fields) {
                try {
                    const parsed = JSON.parse(res.fields);
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { action: 'FILL_FIELDS', data: parsed }).catch(() => {});
                    }, 1500);
                } catch(e) {}
            }
        });
    }
});

export {};
