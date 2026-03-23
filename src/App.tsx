import { useEffect, useState, useRef } from "react";
import { useSaveFields } from "./hooks/saveFields";

export default function App() {
  const [fields, setFields] = useState<any[]>([]);
  const { saveFields, loading, success, loadFields, clearFields, savedCount } = useSaveFields();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [autoLoad, setAutoLoad] = useState<boolean>(false);

  // Refs para mantener vivos los estados dentro de listeners
  const autoSaveRef = useRef(autoSave);
  const autoLoadRef = useRef(autoLoad);
  const fieldsRef = useRef(fields);
  const urlRef = useRef<string | null>(null);

  // 💾 Recuperar preferencias de almacenamiento local y setear defaults
  useEffect(() => {
    chrome.storage.local.get(["autoSavePref", "autoLoadPref"], (res) => {
      if (res.autoSavePref !== undefined) setAutoSave(res.autoSavePref);
      if (res.autoLoadPref !== undefined) setAutoLoad(res.autoLoadPref);
    });
  }, []);

  // Funciones de Guardado persistente de Preferencias
  const toggleAutoSave = () => {
    const val = !autoSave;
    setAutoSave(val);
    chrome.storage.local.set({ autoSavePref: val });
  };

  const toggleAutoLoad = () => {
    const val = !autoLoad;
    setAutoLoad(val);
    chrome.storage.local.set({ autoLoadPref: val });
  };

  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);
  useEffect(() => { autoLoadRef.current = autoLoad; }, [autoLoad]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const scan = () => {
    chrome.tabs.query({ active: true }, (tabs) => {
      const tab = tabs.find(t => t.url && !t.url.startsWith("chrome-extension://"));

      // Validar si la URL ha cambiado constantemente (Soporta SPA y Views en React/Angular)
      if (tab?.url) {
        if (autoLoadRef.current && urlRef.current !== null && tab.url !== urlRef.current) {
          urlRef.current = tab.url;
          setTimeout(() => loadFields(), 1500);
        } else if (!urlRef.current) {
          urlRef.current = tab.url;
        }
      }

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "GET_FIELDS" }, (res: any) => {
          if (chrome.runtime.lastError) return;
          if (res) setFields(res);
        });
      }
    });
  };

  const renderField = (field: any, index: number) => {
    const inputClasses = "w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

    if (field.input.type === "text" || field.input.type === "tel" || field.input.type === "number" || field.input.type === "email" || field.input.type === "password" || field.input.type === "url") {
      return (
        <div className="flex flex-col gap-2">
          <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
        </div>
      );
    } else if (field.input.type === "select-one") {
      return (
        <div className="flex flex-col gap-2">
          <select id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} disabled={field.input.disabled} className={inputClasses}>
            {field.input.options && field.input.options.map((option: any, optIndex: number) => (
              <option key={optIndex} value={option.value}>{option.text}</option>
            ))}
          </select>
        </div>
      );
    } else if (field.input.type === "textarea") {
      return (
        <div className="flex flex-col gap-2">
          <textarea id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses + " resize-y min-h-[80px]"} />
        </div>
      );
    } else if (field.input.type === "checkbox") {
      const isChecked = field.input.value === "true" || field.input.value === "on" || field.input.value === true;
      return (
        <div className="flex flex-row gap-2 items-center">
          <input type={field.input.type} id={field.input.id} name={field.input.name} checked={isChecked} onChange={() => { }} disabled={field.input.disabled} className="rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-violet-500 h-4 w-4" />
          <span className="text-slate-300 text-sm font-medium max-w-[200px] truncate">{field.label.text}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
      </div>
    );
  };

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      scan();
      tick++;

      // Guardado automático cada 5 segundos
      if (autoSaveRef.current && tick % 5 === 0) {
        if (fieldsRef.current.length > 0) {
          saveFields(fieldsRef.current);
        }
      }

    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🌐 Protector Nativo para F5 / Actualizaciones de Pantalla misceláneas
  useEffect(() => {
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Reacciona y Lanza Autocompletado CUALQUIER VEZ QUE SE ACTUALICE LA PÁGINA O PULSEN F5 
      if (changeInfo.status === "complete" && tab.active) {
        if (autoLoadRef.current) {
          setTimeout(() => loadFields(), 1500); 
        }
      }
    };
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  }, []);

  return (
    <div className="w-screen min-h-screen bg-slate-950 text-slate-100 p-5 font-sans pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          FormProv <span className="text-slate-500 font-normal text-sm">v2</span>
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            title="Configuración"
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg shadow-inner transition-all duration-200 group"
          >
            <svg className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={() => clearFields()}
            disabled={loading}
            title="Limpiar biblioteca"
            className="p-2 bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg shadow-inner transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 📊 Indicador de Datos Guardados Globales */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 px-4 py-3 rounded-xl mb-4 backdrop-blur-md shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <span className="font-semibold text-slate-300 text-sm">Biblioteca de Datos</span>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/30 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {savedCount} registros
        </span>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
        {/* Cabecera / Trigger del Acordeón */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors duration-200 border-b border-slate-800/50"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 text-sm">Escaneados en Pantalla</span>
            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full border border-violet-500/30 font-medium">
              {fields.length}
            </span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Contenido Colapsable */}
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[300px] overflow-y-auto p-4 flex flex-col gap-3' : 'max-h-0 overflow-hidden'}`}>
          {fields.map((field, index) => (
            <div key={index} className="flex flex-col gap-1">
              {renderField(field, index)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={() => loadFields()}
          disabled={loading}
          className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium rounded-xl border border-slate-800 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Cargar</span>
        </button>

        <button
          onClick={() => saveFields(fields)}
          disabled={loading}
          className="px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Guardar</span>
        </button>
      </div>

      {/* ⚙️ Automatizadores Toggles */}
      <div className="grid grid-cols-1 gap-2 mt-4">
        <label className={`flex items-center justify-between px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 group ${autoSave ? 'border-fuchsia-500/50 bg-fuchsia-500/5 hover:bg-fuchsia-500/10' : 'border-slate-800 bg-slate-900 hover:bg-slate-800/80 shadow-md'}`}>
          <div className="flex flex-col">
            <span className={`text-sm font-semibold transition-colors ${autoSave ? 'text-fuchsia-400' : 'text-slate-300'}`}>Guardar Automáticamente</span>
            <span className="text-xs text-slate-500">Recopila datos cada 5 segundos</span>
          </div>
          <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${autoSave ? 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.3)]' : 'bg-slate-800 border-2 border-slate-700'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoSave ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <input type="checkbox" className="hidden" checked={autoSave} onChange={toggleAutoSave} />
        </label>

        <label className={`flex items-center justify-between px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 group ${autoLoad ? 'border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10' : 'border-slate-800 bg-slate-900 hover:bg-slate-800/80 shadow-md'}`}>
          <div className="flex flex-col">
            <span className={`text-sm font-semibold transition-colors ${autoLoad ? 'text-violet-400' : 'text-slate-300'}`}>Cargar Automáticamente</span>
            <span className="text-xs text-slate-500">Al interactuar y cambiar la página</span>
          </div>
          <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${autoLoad ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'bg-slate-800 border-2 border-slate-700'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoLoad ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <input type="checkbox" className="hidden" checked={autoLoad} onChange={toggleAutoLoad} />
        </label>
      </div>

    </div>
  );
}
