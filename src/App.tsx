import { useState, useEffect, useRef } from 'react';

type LogType = 'info' | 'success' | 'error';
interface LogItem {
  time: string;
  text: string;
  type: LogType;
}

export default function App() {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [clicksCount, setClicksCount] = useState<number>(0);
  const [elementsFound, setElementsFound] = useState<number>(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const logListRef = useRef<HTMLDivElement>(null);

  // 1. Cargar estado inicial desde chrome.storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['isEnabled', 'clicksCount', 'elementsFound'], (result) => {
        setIsEnabled(result.isEnabled !== undefined ? result.isEnabled : true);
        setClicksCount(result.clicksCount || 0);
        setElementsFound(result.elementsFound || 0);
      });

      // Escuchar actualizaciones de otros scripts (content/background)
      const messageListener = (message: any) => {
        if (message.action === 'updateStats') {
          if (message.clicks !== undefined) setClicksCount(message.clicks);
          if (message.elements !== undefined) setElementsFound(message.elements);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      addLog('🚀 Extensión con TypeScript Iniciada', 'success');

      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  // 2. Auto-scroll en el panel de logs
  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs]);

  // 3. Helper para añadir logs
  const addLog = (message: string, type: LogType = 'info') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setLogs((prev) => [...prev, { time: timeStr, text: message, type }]);
  };

  // 4. Cambiar estado
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsEnabled(checked);
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ isEnabled: checked }, () => {
        addLog(checked ? '✅ Extensión Activada' : '🚫 Extensión Desactivada', checked ? 'success' : 'info');
        chrome.runtime.sendMessage({ action: 'toggleState', isEnabled: checked });
      });
    }
  };

  // 5. Ejecutar función en la página
  const runAction = async () => {
    if (!isEnabled) return;
    addLog('🔎 Escaneando página activa...', 'info');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        addLog('❌ No se encontró pestaña activa', 'error');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'runFeature' }, (response: any) => {
        if (chrome.runtime.lastError) {
          addLog('⚠️ Error: Recarga la página o abre una URL válida', 'error');
        } else if (response) {
          addLog(response.message, response.success ? 'success' : 'error');
          if (response.count !== undefined) setElementsFound(response.count);
        }
      });
    } catch (error: any) {
      addLog(`💥 Error fatal: ${error.message}`, 'error');
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 bg-gradient-to-br from-[#0b0f19] to-transparent w-[350px]">
      {/* Header */}
      <header className="flex justify-between items-center pb-3 border-bottom border-white/5 border-b">
        <div className="flex items-center gap-2.5 relative">
          <div className="absolute w-8 h-8 bg-[#7c4dff] filter blur-xl rounded-full left-0 opacity-40"></div>
          <img src="icons/icon48.png" className="w-8 h-8 z-10" alt="Logo" />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-[#b4bcf4] bg-clip-text text-transparent">Pro TS</h1>
            <span className="text-[10px] text-gray-400">v1.0.0</span>
          </div>
        </div>
        
        {/* Switch */}
        <div className="relative inline-block w-11 h-6">
          <input 
            type="checkbox" 
            id="power-toggle" 
            checked={isEnabled} 
            onChange={handleToggle}
            className="sr-only peer"
          />
          <label htmlFor="power-toggle" className="absolute cursor-pointer inset-0 bg-gray-700 rounded-full peer-checked:bg-[#7c4dff] transition-all duration-300 peer-checked:shadow-[0_0_10px_rgba(124,77,255,0.4)]">
            <span className="absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-all duration-300 peer-checked:translate-x-5 shadow-md"></span>
          </label>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="flex flex-col gap-3">
        {/* Status Card */}
        <div className="bg-[#141b2d] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-300 hover:border-white/10 hover:shadow-lg">
          <div className="w-10 h-10 rounded-lg bg-[#7c4dff]/10 text-[#7c4dff] flex items-center justify-center text-lg">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <div className="flex-grow">
            <p className="text-[11px] text-gray-400">Estado</p>
            <h3 className={`font-semibold text-sm ${isEnabled ? 'text-green-400 status-active-glow' : 'text-gray-400'}`}>
              {isEnabled ? 'Activo' : 'Inactivo'}
            </h3>
          </div>
          {isEnabled && <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(0,230,118,0.4)] animate-pulse"></span>}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox icon="fa-cookie-bite" value={elementsFound} label="Elementos" />
          <StatBox icon="fa-hand-pointer" value={clicksCount} label="Clicks" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            disabled={!isEnabled} 
            onClick={runAction}
            className="flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-[#7c4dff] to-[#ba68c8] text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-transform"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>Ejecutar Acción</span>
          </button>
        </div>

        {/* Log Panel */}
        <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
          <div className="flex justify-between text-[11px] text-gray-400 mb-2 font-semibold">
            <span>Registro de Actividad</span>
            <button className="text-[#7c4dff] text-[10px]" onClick={() => setLogs([])}>Limpiar</button>
          </div>
          <div ref={logListRef} className="h-16 overflow-y-auto font-mono text-[10px] flex flex-col gap-1">
            {logs.map((log, index) => (
              <div key={index} className={`break-all ${log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-white'}`}>
                <span className="text-[#7c4dff]">{log.time}</span> {log.text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[9px] text-gray-500 border-t border-white/5 pt-2 mt-1">
        Creado con <i className="fa-solid fa-heart text-red-500"></i> para Chrome (TS)
      </footer>
    </div>
  );
}

interface StatBoxProps {
  icon: string;
  value: number;
  label: string;
}

function StatBox({ icon, value, label }: StatBoxProps) {
  return (
    <div className="bg-[#141b2d] border border-white/3 rounded-xl p-3 flex items-center gap-2.5">
      <div className="text-gray-400 text-sm"><i className={`fa-solid ${icon}`}></i></div>
      <div>
        <span className="block font-bold text-base">{value}</span>
        <span className="text-[10px] text-gray-400">{label}</span>
      </div>
    </div>
  );
}
