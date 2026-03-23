import { useEffect, useState, useRef } from "react";
import { useSaveFields } from "./hooks/saveFields";

export default function App() {
  const [view, setView] = useState<"main" | "settings">("main");
  const [fields, setFields] = useState<any[]>([]);
  const { saveFields, loading, success, loadFields, clearFields, savedCount } = useSaveFields();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [autoLoad, setAutoLoad] = useState<boolean>(false);
  const [runInBackground, setRunInBackground] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);

  const autoSaveRef = useRef(autoSave);
  const autoLoadRef = useRef(autoLoad);
  const runInBackgroundRef = useRef(runInBackground);
  const fieldsRef = useRef(fields);
  const urlRef = useRef<string | null>(null);
  const previousFieldsSignatureRef = useRef<string>("");

  useEffect(() => {
    chrome.storage.local.get(["autoSavePref", "autoLoadPref", "runInBackgroundPref", "isDarkThemePref"], (res) => {
      if (res.autoSavePref !== undefined) setAutoSave(res.autoSavePref);
      if (res.autoLoadPref !== undefined) setAutoLoad(res.autoLoadPref);
      if (res.runInBackgroundPref !== undefined) setRunInBackground(res.runInBackgroundPref);
      if (res.isDarkThemePref !== undefined) setIsDarkTheme(res.isDarkThemePref);
    });
  }, []);

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

  const toggleRunInBackground = () => {
    const val = !runInBackground;
    setRunInBackground(val);
    chrome.storage.local.set({ runInBackgroundPref: val });
  };

  const toggleTheme = () => {
    const val = !isDarkTheme;
    setIsDarkTheme(val);
    chrome.storage.local.set({ isDarkThemePref: val });
  };

  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);
  useEffect(() => { autoLoadRef.current = autoLoad; }, [autoLoad]);
  useEffect(() => { runInBackgroundRef.current = runInBackground; }, [runInBackground]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const scan = () => {
    chrome.tabs.query({ active: true }, (tabs) => {
      const tab = tabs.find(t => t.url && !t.url.startsWith("chrome-extension://"));

      if (tab?.url) {
        if (autoLoadRef.current && urlRef.current !== null && tab.url !== urlRef.current) {
          urlRef.current = tab.url;
          if (!runInBackgroundRef.current) setTimeout(() => loadFields(), 800);
        } else if (!urlRef.current) {
          urlRef.current = tab.url;
        }
      }

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "GET_FIELDS" }, (res: any) => {
          if (chrome.runtime.lastError) return;
          if (res) {
            setFields(res);

            // Vigía de Mutaciones DOM Reales (El mejor detector de SPAs, Modales y Angular)
            const signature = res.map((f: any) => f.input.id || f.input.name || f.input.className || (f.input.options ? f.input.options.length : 0)).join(",");
            if (signature !== previousFieldsSignatureRef.current) {
              const inicial = previousFieldsSignatureRef.current === "";
              previousFieldsSignatureRef.current = signature;

              if (!inicial && autoLoadRef.current && res.length > 0 && !runInBackgroundRef.current) {
                // ⏱️ Otorga 600ms a React/Angular para asentar sus variables de estado internas antes de forzar el autocompletado en el select recién construido
                setTimeout(() => loadFields(), 600);
              }
            }
          }
        });
      }
    });
  };

  const renderField = (field: any, index: number) => {
    const inputClasses = "w-full px-4 py-2 bg-[#F3F4F6] dark:bg-slate-900 border-none dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#A2EBF2]/50 dark:focus:ring-violet-500/50 text-sm transition-all";

    if (field.input.type === "text" || field.input.type === "tel" || field.input.type === "number" || field.input.type === "email" || field.input.type === "password" || field.input.type === "url") {
      return (
        <div className="flex flex-col">
          <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
        </div>
      );
    } else if (field.input.type === "select-one") {
      return (
        <div className="flex flex-col">
          <select id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} disabled={field.input.disabled} className={inputClasses + " cursor-pointer"}>
            {field.input.options && field.input.options.map((option: any, optIndex: number) => (
              <option key={optIndex} value={option.value}>{option.text}</option>
            ))}
          </select>
        </div>
      );
    } else if (field.input.type === "textarea") {
      return (
        <div className="flex flex-col">
          <textarea id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses + " resize-y min-h-[60px] pb-1"} />
        </div>
      );
    } else if (field.input.type === "checkbox") {
      const isChecked = field.input.value === "true" || field.input.value === "on" || field.input.value === true;
      return (
        <div className="flex flex-row gap-2.5 items-center px-1 py-0.5">
          <input type={field.input.type} id={field.input.id} name={field.input.name} checked={isChecked} onChange={() => { }} disabled={field.input.disabled} className="rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 dark:text-violet-500 focus:ring-cyan-200 dark:focus:ring-violet-500 h-4 w-4" />
          <span className="text-slate-700 dark:text-slate-300 text-xs font-bold max-w-[200px] truncate">{field.label.text}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => { }} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
      </div>
    );
  };

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      scan();
      tick++;
      if (autoSaveRef.current && tick % 3 === 0) {
        if (fieldsRef.current.length > 0) {
          saveFields(fieldsRef.current);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === "complete" && tab.active) {
        if (autoLoadRef.current && !runInBackgroundRef.current) {
          setTimeout(() => loadFields(), 800);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    return () => chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  }, []);

  // VISTA DE CONFIGURACIONES
  if (view === "settings") {
    return (
      <div className={isDarkTheme ? 'dark' : ''}>
        <div className="w-screen min-h-screen bg-[#F4F6F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-5 font-sans relative transition-colors duration-300">
          <button onClick={() => setView("main")} className="mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-sm">Volver</span>
          </button>

          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <svg className="w-5 h-5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración Avanzada
          </h2>

          <div className="flex flex-col gap-3">
            <label className={`flex items-center justify-between px-4 py-4 border rounded-xl cursor-pointer transition-all duration-200 group ${runInBackground ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10' : 'bg-white dark:bg-slate-900 border-slate-100/80 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/80 shadow-sm dark:shadow-md'}`}>
              <div className="flex flex-col pr-4">
                <span className={`text-sm font-semibold transition-colors ${runInBackground ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-300'}`}>Ejecutar de Fondo</span>
                <span className="text-xs text-slate-500 mt-1">Mantiene el recolector y cargador en Background aunque cierres el panel. (Worker Mode)</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${runInBackground ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-200 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${runInBackground ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <input type="checkbox" className="hidden" checked={runInBackground} onChange={toggleRunInBackground} />
            </label>

            <label className={`flex items-center justify-between px-4 py-4 border rounded-xl cursor-pointer transition-all duration-200 group ${isDarkTheme ? 'border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10' : 'bg-white dark:bg-slate-900 border-slate-100/80 hover:bg-slate-50/40 shadow-sm'}`}>
              <div className="flex flex-col pr-4">
                <span className={`text-sm font-semibold transition-colors ${isDarkTheme ? 'text-violet-400' : 'text-slate-800'}`}>Modo Oscuro</span>
                <span className="text-xs text-slate-500 mt-1">Cambia la apariencia a tonos oscuros (Techy style).</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${isDarkTheme ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'bg-slate-200 border-2 border-transparent'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${isDarkTheme ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <input type="checkbox" className="hidden" checked={isDarkTheme} onChange={toggleTheme} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // VISTA PRINCIPAL
  return (
    <div className={isDarkTheme ? 'dark' : ''}>
      <div className="w-screen min-h-screen bg-[#F4F6F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-5 font-sans pb-10 transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1">
            AutoFormPro <span className="text-xl">👋</span>
          </h1>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setView("settings")}
              title="Configuración"
              className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 shadow-sm hover:shadow-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 group relative"
            >
              {/* Pequeño punto indicador si RunInBackground está activo */}
              {runInBackground && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-md border border-white dark:border-slate-800"></span>}
              <svg className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={() => clearFields()}
              disabled={loading}
              title="Limpiar biblioteca"
              className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 shadow-sm hover:border-red-100 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 px-4 py-4 rounded-3xl mb-4 shadow-[0_8px_25px_rgba(0,0,0,0.04)] dark:shadow-md border-transparent transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#A2EBF2]/20 dark:bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Biblioteca de Datos</span>
          </div>
          <span className="px-2.5 py-1 bg-[#DDF6E3] dark:bg-emerald-500/10 text-[#22823B] dark:text-emerald-400 text-xs rounded-full border border-[#BFF0CA] dark:border-emerald-500/30 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22823B] dark:bg-emerald-400 animate-pulse" />
            {savedCount} registros
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.04)] dark:shadow-md border-transparent transition-colors duration-300">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-200 border-b border-slate-50 dark:border-slate-800"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Escaneados en Pantalla</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full font-bold">
                {fields.length}
              </span>
            </div>
            <div className="w-5 h-5 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
              <svg className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[300px] overflow-y-auto p-4 flex flex-col gap-2' : 'max-h-0 overflow-hidden'}`}>
            {fields.map((field, index) => (
              <div key={index} className="flex flex-col gap-1 bg-[#FAFBFC] dark:bg-slate-800/50 rounded-2xl border border-slate-50/80 dark:border-slate-700/50 p-2">
                {renderField(field, index)}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => loadFields()}
            disabled={loading}
            className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl border border-slate-100/80 dark:border-slate-700 shadow-[0_4px_15px_rgba(0,0,0,0.04)] dark:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Cargar</span>
          </button>

          <button
            onClick={() => saveFields(fields)}
            disabled={loading}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.06)] dark:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Guardar</span>
          </button>
        </div>

        {/* ⚙️ Automatizadores Toggles */}
        <div className="grid grid-cols-1 gap-2 mt-4">
          <label className={`flex items-center justify-between p-4 border border-slate-100/80 dark:border-slate-800 rounded-2xl cursor-pointer transition-all duration-200 bg-white dark:bg-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-800/80 shadow-[0_6px_20px_rgba(0,0,0,0.03)] dark:shadow-md`}>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Guardar Automáticamente</span>
              <span className="text-xs text-slate-400 mt-0.5">Recopila datos cada 5 segundos</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${autoSave ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${autoSave ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" className="hidden" checked={autoSave} onChange={toggleAutoSave} />
          </label>

          <label className={`flex items-center justify-between p-4 border border-slate-100/80 dark:border-slate-800 rounded-2xl cursor-pointer transition-all duration-200 bg-white dark:bg-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-800/80 shadow-[0_6px_20px_rgba(0,0,0,0.03)] dark:shadow-md`}>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Cargar Automáticamente</span>
              <span className="text-xs text-slate-400 mt-0.5">Al cambiar de página o navegar</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex flex-shrink-0 items-center ${autoLoad ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${autoLoad ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" className="hidden" checked={autoLoad} onChange={toggleAutoLoad} />
          </label>
        </div>

        {/* 💡 Banner Informativo de Uso */}
        {(autoSave || autoLoad) && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-amber-500/20 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:shadow-md">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tip de Uso</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mt-0.5">
                Úsalas solo durante el llenado de formularios para no sobreescribir datos.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
