import { useState } from "react";

// Hook para guardar campos en chrome storage con feedback de estado
export const useSaveFields = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);

    const saveFields = (fields: any[]) => {
        setLoading(true);
        setSuccess(false);

        try {
            // 📖 1. Primero cargamos lo que ya hay guardado en la biblioteca
            chrome.storage.local.get(["fields"], (result) => {
                let existingFields: any[] = [];
                if (result.fields) {
                    try {
                        existingFields = JSON.parse(result.fields);
                    } catch (e) {
                        existingFields = [];
                    }
                }

                // 🤝 2. Fusionamos la biblioteca con los nuevos campos (sin machacar)
                const mergedFields = [...existingFields];

                fields.forEach((newField: any) => {
                    // 🛡️ Búsqueda estricta multidimensional para que campos con el mismo label.text no se machaquen
                    const index = mergedFields.findIndex(f => 
                        f.label.text === newField.label.text &&
                        f.input.id === newField.input.id &&
                        f.input.className === newField.input.className &&
                        f.input.domIndex === newField.input.domIndex
                    );

                    if (index !== -1) {
                        // 🔄 Si ya existe el campo EXACTO, actualizamos su valor
                        mergedFields[index].input.value = newField.input.value;
                    } else {
                        // 📥 Si es un campo totalmente nuevo, lo agregamos a la biblioteca
                        mergedFields.push(newField);
                    }
                });

                const json = JSON.stringify(mergedFields);
                console.log("-> Biblioteca antes de guardar:", mergedFields);

                // 💾 3. Guardamos la biblioteca completa fusionada
                chrome.storage.local.set({ fields: json }, () => {
                    setLoading(false);
                    setSuccess(true);
                    console.log("-> Biblioteca guardada en Chrome Storage:", json);

                    setTimeout(() => setSuccess(false), 2000);
                });
            });

        } catch (error) {
            setLoading(false);
            console.error("-> Error al guardar campos:", error);
        }
    };

    const loadFields = () => {
        chrome.storage.local.get(["fields"], (result) => {
            if (result.fields) {
                try {
                    const parsedFields = JSON.parse(result.fields);
                    console.log("-> Campos cargados desde Chrome Storage:", parsedFields);

                    // 📩 Enviar al content script de la pestaña activa para interactuar con la web
                    chrome.tabs.query({ active: true }, (tabs) => {
                        // Buscamos el tab que no sea del SidePanel
                        const tab = tabs.find(t => t.url && !t.url.startsWith("chrome-extension://"));

                        if (tab?.id) {
                            console.log("-> Enviando FILL_FIELDS al Tab:", tab.id);
                            chrome.tabs.sendMessage(tab.id, { action: "FILL_FIELDS", data: parsedFields }, (response) => {
                                console.log("-> Respuesta de FILL_FIELDS:", response);
                            });
                        } else {
                            console.warn("-> No se encontró ningún tab activo válido para rellenar.");
                        }
                    });

                } catch (error) {
                    console.error("-> Error al parsear campos:", error);
                }
            }
        });
    };

    const clearFields = () => {
        chrome.storage.local.remove(["fields"], () => {
            console.log("-> Campos borrados de Chrome Storage");
        });
    };

    return { saveFields, loading, success, loadFields, clearFields };
};