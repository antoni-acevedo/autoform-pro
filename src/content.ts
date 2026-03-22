function getXPath(element: any): string {
    let path = "";
    for (let current = element; current && current.nodeType === 1; current = current.parentNode) {
        let index = 1;
        for (let sib = current.previousSibling; sib; sib = sib.previousSibling) {
            if (sib.nodeType === 1 && sib.nodeName === current.nodeName) index++;
        }
        const tagName = current.nodeName.toLowerCase();
        path = `/${tagName}[${index}]` + path;
    }
    return path;
}

function fillElementValue(element: any, value: any) {
    try {
        if (element.type === "checkbox") {
            const isChecked = value === "true" || value === "on" || value === true;
            // 🖱️ El clic nativo engaña al 100% a React y renderiza pseudo-clases Tailwind de inmediato
            if (element.checked !== isChecked) {
                element.click();
            }
            // Fallback por si acaso:
            element.checked = isChecked;
        } else {
            let setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            let actualValue = value;

            if (element.tagName === "SELECT") {
                setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
                // 🎯 Refuerzo exclusivo para <select>: Asegurar index correcto primero!
                if (element.options) {
                    for (let i = 0; i < element.options.length; i++) {
                        if (element.options[i].value === value || element.options[i].textContent?.trim() === value) {
                            element.selectedIndex = i;
                            actualValue = element.options[i].value; // Extraer el valor real de la opción
                            break;
                        }
                    }
                }
            } else if (element.tagName === "TEXTAREA") {
                setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            }

            if (setter) setter.call(element, actualValue);
            else element.value = actualValue;
        }

        // 💥 Tormenta de Eventos para obligar a React/Angular a guardar el estado de inmediato
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

    } catch (error) {
        console.warn("-> Error al usar setter nativo, cayendo en fallback:", error);
        if (element.type === "checkbox") {
            element.checked = value === "true" || value === "on";
        } else {
            element.value = value;
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function getLabelInfo(input: any): { text: string, method: string } {
    if (input.placeholder) {
        return { text: input.placeholder.trim(), method: "placeholder" };
    }
    if (input.id) {
        return { text: input.id, method: "id" };
    }

    // Fallback absoluto por XPath
    return { text: getXPath(input), method: "xpath" };
}

// 📌 Función Maestra para encadenar estrategias EN ORDEN DEL DOM
function getFields() {
    const fields: any[] = [];

    // 1. Buscamos TODOS los inputs en el orden exacto en el que aparecen en la web
    const allInputs = document.querySelectorAll('input, select, textarea');

    Array.from(allInputs).forEach((input: any, domIndex: number) => {
        // 🛑 Ignoramos inputs de tipo archivo (File)
        if (input.type === "file") return;

        const info = getLabelInfo(input);

        // 📥 Extraemos opciones si es un <select>
        const options: any[] = [];
        if (input.tagName.toLowerCase() === 'select') {
            input.querySelectorAll('option').forEach((opt: any) => {
                options.push({
                    value: opt.value || "",
                    text: opt.textContent?.trim() || ""
                });
            });
        }

        // Empujamos el campo (SIEMPRE EN ORDEN)
        fields.push({
            label: info,
            input: {
                value: input.type === "checkbox" ? String(input.checked) : (input.value || ""),
                name: input.name || "",
                type: input.type || input.tagName.toLowerCase(),
                placeholder: input.placeholder || "",
                id: input.id || "",
                className: input.className || "", // Para trackear selects/checkbox sin nombre
                domIndex: domIndex,               // Orden en el árbol
                disabled: input.disabled || false,
                options: options.length > 0 ? options : undefined
            }
        });
    });

    return fields;
}


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("-> Mensaje recibido en content.ts:", message);
    if (message.action === 'GET_FIELDS') {
        const fields = getFields();
        sendResponse(fields);
    }
    else if (message.action === 'FILL_FIELDS') {
        const data = message.data || [];

        const fillSequentially = async () => {
            const usedElements = new Set<any>(); // 🛡️ Evitar que 1 input genérico se robe todos los datos idénticos

            for (const savedField of data) {
                const targetLabel = savedField.label.text;
                const targetMethod = savedField.label.method;
                const valueToSet = savedField.input.value;

                let current: any = null;

                // 🎯 1. Intento Primario y Absoluto: XPath Directo (Si fue guardado por XPath)
                if (targetMethod === "xpath") {
                    try {
                        let cleanXpath = targetLabel.replace(/^XPath\(/, "").replace(/\)$/, "");
                        const result = document.evaluate(cleanXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        const xpathNode = result.singleNodeValue;
                        if (xpathNode && !usedElements.has(xpathNode)) {
                            current = xpathNode;
                        }
                    } catch (e) {
                        console.warn("Fallback primario de XPath falló:", e);
                    }
                }

                // 🎯 2. Si es Método normal (placeholder, id) o el XPath falló, vamos a Puntuación Ponderada
                if (!current) {
                    let highestScore = 0;
                    const allInputs = document.querySelectorAll('input, select, textarea');
                    const candidates = Array.from(allInputs) as any[];

                    const isFuzzyMatch = (a: string, b: string) => {
                        if (!a || !b) return false;
                        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_\-]+/g, "");
                        return normalize(a) === normalize(b);
                    };

                    for (let i = 0; i < candidates.length; i++) {
                        const candidate = candidates[i];
                        if (candidate.type === "file") continue;
                        if (usedElements.has(candidate)) continue; // 🛡️ Ya lo rellenamos, pasamos al siguiente clon!

                        let score = 0;

                        // Matches Estrictos
                        if (savedField.input.id && candidate.id === savedField.input.id) score += 100;
                        if (savedField.input.name && candidate.name === savedField.input.name) score += 90;

                        // Matches Fuzzy
                        if (savedField.input.id && isFuzzyMatch(candidate.id, savedField.input.id)) score += 80;
                        if (savedField.input.name && isFuzzyMatch(candidate.name, savedField.input.name)) score += 70;
                        if (targetMethod === "placeholder" && isFuzzyMatch(candidate.placeholder, targetLabel)) score += 60;
                        if (targetMethod === "id" && isFuzzyMatch(candidate.id, targetLabel)) score += 60;

                        // Refuerzo Estructural
                        if (savedField.input.type && candidate.type === savedField.input.type) score += 10;
                        if (savedField.input.className && candidate.className === savedField.input.className) score += 20;
                        if (savedField.input.domIndex !== undefined && i === savedField.input.domIndex) score += 5;

                        // Refuerzo Selects
                        if (candidate.tagName === "SELECT" && savedField.input.options) {
                            const candidateOptions = Array.from(candidate.querySelectorAll('option')).map((o: any) => o.textContent?.trim());
                            const savedOptions = savedField.input.options.map((o: any) => o.text);
                            if (JSON.stringify(candidateOptions) === JSON.stringify(savedOptions)) {
                                score += 30;
                            }
                        }

                        // Superar el umbral estricto para evitar falsos positivos (+30 asegura que al menos coincidió tipo + clase)
                        if (score > highestScore && score >= 30) {
                            highestScore = score;
                            current = candidate;
                        }
                    }
                }

                // 🚀 Rellenar el campo y bloquearlo para el siguiente loop
                if (current) {
                    console.log(`-> Rellenando ${current.tagName} (${targetLabel}) con:`, valueToSet);
                    usedElements.add(current);
                    fillElementValue(current, valueToSet);
                    // ⏱️ Pequeña pausa de 100ms para permitir a React/Angular comitear el DOM
                    await new Promise(r => setTimeout(r, 100));
                } else {
                    console.warn(`-> No se encontró match libre para: ${targetLabel} (Método: ${targetMethod})`);
                }
            } // fin for

            sendResponse({ success: true, message: "Campos rellenados" });
        };

        fillSequentially();
        return true; // Keep message channel open for async execution
    }
    return true;
});

export { };
