import { useEffect, useState } from "react";

export default function App() {
  const [fields, setFields] = useState<any[]>([]);

  const scan = () => {

    // Consultamos TODOS los tabs activos (en todas las ventanas)
    chrome.tabs.query({ active: true }, (tabs) => {
      // Buscamos el tab que no sea del SidePanel o el que esté visible
      const tab = tabs.find(t => t.url && !t.url.startsWith("chrome-extension://"));

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "GET_FIELDS" }, (res: any) => {
          if (chrome.runtime.lastError) {
            console.error("-> Error de comunicación:", chrome.runtime.lastError.message);
            return;
          }
          console.log("-> Campos encontrados:", res);
          setFields(res);
        });
      } else {
        console.warn("-> No se encontró ningún tab activo válido para escanear.");
      }
    });

  };

  const renderField = (field: any, index: number) => {


    const inputClasses = "w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

    if (field.input.type === "text" || field.input.type === "tel" || field.input.type === "number" || field.input.type === "email" || field.input.type === "password" || field.input.type === "url") {
      return (
        <div className="flex flex-col gap-2">
          <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => {}} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
        </div>
      )
    } else if (field.input.type === "select-one") {
      return (
        <div className="flex flex-col gap-2">
          <select id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => {}} disabled={field.input.disabled} className={inputClasses}>
            {field.input.options && field.input.options.map((option: any, optIndex: number) => (
              <option key={optIndex} value={option.value}>{option.text}</option>
            ))}
          </select>
        </div>
      )
    }

    if (field.input.type === "textarea") {
      return (
        <div className="flex flex-col gap-2">
          <textarea id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => {}} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses + " resize-y min-h-[80px]"} />
        </div>
      )
    }

    if (field.input.type === "checkbox") {
      const isChecked = field.input.value === "true" || field.input.value === "on" || field.input.value === true;
      return (
        <div className="flex flex-row gap-2 items-center">
          <input type={field.input.type} id={field.input.id} name={field.input.name} checked={isChecked} onChange={() => {}} disabled={field.input.disabled} className="rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-violet-500 h-4 w-4" />
          <span className="text-slate-300 text-sm font-medium max-w-[200px] truncate">{field.label.text}</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value || ""} onChange={() => {}} placeholder={field.label.text} disabled={field.input.disabled} className={inputClasses} />
      </div>
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      scan();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-screen min-h-screen bg-slate-950 text-slate-100 p-5 font-sans">
      <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
        FormProv <span className="text-slate-500 font-normal text-sm">v2</span>
      </h1>

      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div key={index} className="flex flex-col gap-2">
            {renderField(field, index)}
          </div>
        ))}
      </div>

    </div>
  );
}
