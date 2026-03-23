import { useState, useEffect } from "react";

// Hook para guardar campos en chrome storage con feedback de estado
export const useSaveFields = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [savedCount, setSavedCount] = useState<number>(0);

    // Efecto para mantener sincronizado el contador de la base de datos
    useEffect(() => {
        const fetchCount = () => {
            chrome.storage.local.get(["fields"], (result) => {
                if (result.fields) {
                    try {
                        const parsed = JSON.parse(result.fields);
                        setSavedCount(parsed.length);
                    } catch { setSavedCount(0); }
                } else setSavedCount(0);
            });
        };

        fetchCount();
        const changeListener = (changes: any, namespace: string) => {
            if (namespace === "local" && changes.fields) fetchCount();
        };
        chrome.storage.onChanged.addListener(changeListener);

        return () => chrome.storage.onChanged.removeListener(changeListener);
    }, []);

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

                // 🌟 Buscador Léxico de Variantes para Autocorreción de Formatos
                const isFuzzyMatch = (a: string, b: string) => {
                    if (!a || !b) return false;
                    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_\-]+/g, "");
                    return normalize(a) === normalize(b);
                };

                // 🤝 2. Fusionamos la biblioteca con los nuevos campos (Actualizando los viejos inteligentemente)
                const mergedFields = [...existingFields];

                fields.forEach((newField: any) => {
                    // 🛡️ Búsqueda de Actualidad (Prioridad: ID > Name > XPath > Todo lo demás)
                    const index = mergedFields.findIndex(f => {
                        if (newField.input.id && f.input.id) {
                            return isFuzzyMatch(f.input.id, newField.input.id);
                        }
                        if (newField.input.name && f.input.name) {
                            return isFuzzyMatch(f.input.name, newField.input.name);
                        }
                        if (newField.label.method === "xpath" && f.label.method === "xpath") {
                            return f.label.text === newField.label.text;
                        }
                        // Si carecen de identificadores fiables, se usa coincidencia estricta espacial
                        return isFuzzyMatch(f.label.text, newField.label.text) &&
                               f.input.className === newField.input.className &&
                               f.input.domIndex === newField.input.domIndex;
                    });

                    if (index !== -1) {
                        // 🔄 Si encontramos un primo evolutivo, ABSORBEMOS su conocimiento moderno completo (auto-sanación)
                        mergedFields[index] = newField;
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

    return { saveFields, loading, success, loadFields, clearFields, savedCount };
};