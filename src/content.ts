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
            if (element.tagName === "SELECT") {
                setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
            } else if (element.tagName === "TEXTAREA") {
                setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            }

            if (setter) setter.call(element, value);
            else element.value = value;

            // 🎯 Refuerzo exclusivo para <select>: Asegurar index correcto
            if (element.tagName === "SELECT" && element.options) {
                for (let i = 0; i < element.options.length; i++) {
                    if (element.options[i].value === value || element.options[i].textContent?.trim() === value) {
                        element.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        // 💥 Disparar eventos para que el framework se entere del cambio
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

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
        
        data.forEach((savedField: any) => {
            const targetLabel = savedField.label.text;
            const targetMethod = savedField.label.method;
            const valueToSet = savedField.input.value;

            let current: any = null;
            let highestScore = 0;

            const allInputs = document.querySelectorAll('input, select, textarea');
            const candidates = Array.from(allInputs) as any[];

            // 🎯 Algoritmo de Búsqueda Ponderada
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                if (candidate.type === "file") continue;
                
                let score = 0;
                
                // 1️⃣ Matches Exactos (casi garantizan que es el mismo)
                if (savedField.input.id && candidate.id === savedField.input.id) score += 100;
                if (savedField.input.name && candidate.name === savedField.input.name) score += 90;
                
                // 2️⃣ Prioridad por el Mismo Método de Detección
                if (targetMethod === "placeholder" && candidate.placeholder === targetLabel) score += 80;
                if (targetMethod === "id" && candidate.id === targetLabel) score += 80;

                // 3️⃣ Refuerzo Estructural para Checkboxes y Selects sin Atributos
                if (savedField.input.type && candidate.type === savedField.input.type) score += 10;
                if (savedField.input.className && candidate.className === savedField.input.className) score += 20; // Clases Tailwind ayudan
                if (savedField.input.domIndex !== undefined && i === savedField.input.domIndex) score += 5;      // Misma posición DOM
                
                // 4️⃣ Bonus Exclusivo para <select>: Coincidencia de Hijos Option
                if (candidate.tagName === "SELECT" && savedField.input.options) {
                    const candidateOptions = Array.from(candidate.querySelectorAll('option')).map((o:any)=>o.textContent?.trim());
                    const savedOptions = savedField.input.options.map((o:any)=>o.text);
                    if (JSON.stringify(candidateOptions) === JSON.stringify(savedOptions)) {
                        score += 30;
                    }
                }

                // Superar el umbral y tomar el mejor candidato
                if (score > highestScore && score >= 20) {
                    highestScore = score;
                    current = candidate;
                }
            }

            // 🤖 Búsqueda de Emergencia (Si el scoring falló, pero el guardado original decía usar XPath)
            if (!current && targetMethod === "xpath") {
                try {
                    let cleanXpath = targetLabel.replace(/^XPath\(/, "").replace(/\)$/, "");
                    current = document.evaluate(cleanXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                } catch (e) {
                    console.warn("Fallback de XPath falló:", e);
                }
            }

            // 🚀 Rellenar el campo si se encontró algo sólido
            if (current) {
                console.log(`-> Rellenando ${current.tagName} (${targetLabel} | Puntos: ${highestScore}) con:`, valueToSet);
                fillElementValue(current, valueToSet);
            } else {
                console.warn(`-> No se encontró match para: ${targetLabel} (Método: ${targetMethod})`);
            }
        });

        sendResponse({ success: true, message: "Campos rellenados" });
    }
    return true;
});

export { };
