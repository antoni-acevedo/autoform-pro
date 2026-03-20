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
    if (field.input.type === "checkbox") {
      return (
        <div className="flex flex-row gap-2">
          <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value} placeholder={field.input.placeholder} disabled={field.input.disabled} />
          <label htmlFor={field.input.id}>{field.label.text}</label>
        </div>
      )
    } else {
      return (
        <div className="flex flex-col gap-2">
          <label htmlFor={field.input.id}>{field.label.text}</label>
          <input type={field.input.type} id={field.input.id} name={field.input.name} value={field.input.value} placeholder={field.input.placeholder} disabled={field.input.disabled} />
        </div>
      )
    }
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
