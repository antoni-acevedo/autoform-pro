import { useEffect, useState } from 'react';


export default function App() {
  const [inputsHTML, setInputsHTML] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  async function GetInputsHTML() {
    // 1. Encontrar la pestaña activa donde está el usuario
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      // 2. Mandarle un mensaje pidiendo una acción
      chrome.tabs.sendMessage(tab.id, { action: 'getInputsHTML' }, (respuesta) => {
        if (chrome.runtime.lastError) {
          // Capturar el error evita que aparezca el "Unchecked runtime.lastError"
          console.warn("Content script no disponible aún:", chrome.runtime.lastError.message);
          return;
        }

        if (respuesta?.inputsHTML) {
          setInputsHTML(respuesta.inputsHTML);
        }
      });
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      GetInputsHTML()
    }, 1000);
    return () => clearInterval(intervalId);
  }, [])

  useEffect(() => {
    const initial: Record<string, string> = {};
    inputsHTML.forEach((input: any) => {
      const key = input.id || input.name || input.value;
      if (key) initial[key] = input.value || input.placeholder || '';
    });
    setFormValues((prev) => ({ ...initial, ...prev }));
  }, [inputsHTML]);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  function renderElements() {
    //crear los elementos
    const elements = inputsHTML.map((input: any, index: number) => {

      if (input.type === 'text') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor={input.id}>{input.placeholder || input.value}</label>
            <input onChange={(e: any) => handleInputChange(input.id, e.target.value)} disabled={input.disabled} type={input.type} placeholder={input.placeholder} defaultValue={input.value} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
          </div>
        )
      }

      if (input.type === 'select-one') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor="select">{input.options?.[0]?.text || "Select"}</label>
            <select disabled={input.disabled} name={input.name} id={input.id} value={input.value} onChange={(e: any) => handleInputChange(input.id, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed'>
              {input.options?.map((option: any, index: number) => (
                <option key={index} value={option.value}>{option.text}</option>
              ))}
            </select>
          </div>
        )
      }

      if (input.type === 'datetime-local') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor={input.id}>{input.placeholder || input.value}</label>
            <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e: any) => handleInputChange(input.id, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
          </div>
        )
      }

      if (input.type === 'textarea') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor={input.id}>{input.placeholder || input.value}</label>
            <textarea disabled={input.disabled} placeholder={input.placeholder} value={input.value} onChange={(e: any) => handleInputChange(input.id, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
          </div>
        )
      }

      if (input.type === 'email') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor={input.id}>{input.placeholder || input.value}</label>
            <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e: any) => handleInputChange(input.id, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
          </div>
        )
      }

      if (input.type === 'tel') {
        return (
          <div key={index} className="flex flex-col space-y-2">
            <label htmlFor={input.id}>Numero de Telefono</label>
            <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={input.value} onChange={(e: any) => handleInputChange(input.id, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
          </div>
        )
      }
      return null;
    })
    return elements;
  }

  function FillForm() {
    console.log(formValues);
  }

  return (
    // En un SidePanel, w-full y h-screen llenan exactamente el panel lateral de Chrome
    <div className="w-screen min-h-screen bg-white text-black p-6 flex flex-col space-y-2">
      <h1 className="text-xl font-bold">Side Panel</h1>
      <p className="text-sm text-gray-500 mt-2">¡Configurado correctamente!</p>


      <div className="flex flex-col space-y-5 pt-10 pr-3 pb-5">
        {renderElements()}
      </div>

      <button onClick={FillForm} className='bg-blue-500 text-white px-4 py-2 rounded-md'>Guardar Datos</button>
    </div>
  );
}
