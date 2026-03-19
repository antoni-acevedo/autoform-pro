import React from 'react';

interface FormElementsProps {
  inputsHTML: any[];
  formValues: Record<string, any>;
  handleInputChange: (key: string, value: string) => void;
}

export function FormElements({ inputsHTML, formValues, handleInputChange }: FormElementsProps) {
  const elements = inputsHTML.map((input: any, index: number) => {
    const key = input.id || input.name || input.value;
    const value = formValues[key]?.value || '';

    if (input.type === 'text') {
      return (
        <div key={index} className="flex flex-col space-y-2">
          <label htmlFor={input.id}>{input.placeholder || input.value}</label>
          <input onChange={(e: any) => handleInputChange(key, e.target.value)} disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={value} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
        </div>
      )
    }

    if (input.type === 'select-one') {
      return (
        <div key={index} className="flex flex-col space-y-2">
          <label htmlFor="select">{input.options?.[0]?.text || "Select"}</label>
          <select disabled={input.disabled} name={input.name} id={input.id} value={value} onChange={(e: any) => handleInputChange(key, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed'>
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
          <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={value} onChange={(e: any) => handleInputChange(key, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
        </div>
      )
    }

    if (input.type === 'textarea') {
      return (
        <div key={index} className="flex flex-col space-y-2">
          <label htmlFor={input.id}>{input.placeholder || input.value}</label>
          <textarea disabled={input.disabled} placeholder={input.placeholder} value={value} onChange={(e: any) => handleInputChange(key, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
        </div>
      )
    }

    if (input.type === 'email') {
      return (
        <div key={index} className="flex flex-col space-y-2">
          <label htmlFor={input.id}>{input.placeholder || input.value}</label>
          <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={value} onChange={(e: any) => handleInputChange(key, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
        </div>
      )
    }

    if (input.type === 'tel') {
      return (
        <div key={index} className="flex flex-col space-y-2">
          <label htmlFor={input.id}>Numero de Telefono</label>
          <input disabled={input.disabled} type={input.type} placeholder={input.placeholder} value={value} onChange={(e: any) => handleInputChange(key, e.target.value)} className='bg-white border border-1 border-gray-300 rounded-md p-2 disabled:bg-gray-200 disabled:cursor-not-allowed' />
        </div>
      )
    }
    return null;
  });

  return <>{elements}</>;
}
