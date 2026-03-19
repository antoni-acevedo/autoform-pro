import { useState, useEffect } from 'react';

export function useInputsData() {
  const [inputsHTML, setInputsHTML] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  async function GetInputsHTML() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'getInputsHTML' }, (respuesta) => {
        if (chrome.runtime.lastError) {
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
      GetInputsHTML();
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const initial: Record<string, any> = {};
    inputsHTML.forEach((input: any) => {
      const key = input.id || input.name || input.value;
      if (key) {
        initial[key] = {
          id: input.id,
          name: input.name,
          type: input.type,
          placeholder: input.placeholder,
          value: input.value || '',
          required: input.required,
          disabled: input.disabled,
          readonly: input.readonly,
          options: input.options,
        };
      }
    });

    setFormValues((prev) => {
      const next: Record<string, any> = { ...initial };
      for (const key in prev) {
        if (key in initial) {
          next[key] = {
            ...initial[key],
            value: prev[key]?.value !== undefined ? prev[key].value : initial[key].value
          };
        }
      }
      return next;
    });
  }, [inputsHTML]);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  return {
    inputsHTML,
    formValues,
    handleInputChange,
    GetInputsHTML,
  };
}
