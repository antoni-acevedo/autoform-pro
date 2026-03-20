function strategy1(processedInputs: Set<HTMLInputElement>, fields: any[]) {
    const getDivs = document.querySelectorAll('div');

    getDivs.forEach((div: any) => {
        const label = div.querySelector('label');
        const input = div.querySelector('input');

        if (label && input) {
            // Si ya procesamos este input, lo saltamos
            if (processedInputs.has(input)) return;

            fields.push({
                label: { text: label.textContent?.trim() || "" },
                input: {
                    value: input.value || "",
                    name: input.name || input.id || "sin-nombre",
                    type: input.type || "text",
                    placeholder: input.placeholder || "",
                    id: input.id || "sin-id",
                    disabled: input.disabled || false
                }
            });
            processedInputs.add(input);
        }
    });
}

// 📌 Estrategia 2: Si no hay <label>, usamos el Placeholder como etiqueta
function strategy2(processedInputs: Set<HTMLInputElement>, fields: any[]) {
    const allInputs = document.querySelectorAll('input');

    allInputs.forEach((input: any) => {
        if (!processedInputs.has(input) && input.placeholder) {
            console.log("-> Estrategia 2 (Placeholder) encontrada para:", input);
            fields.push({
                label: { text: input.placeholder.trim() + " (Placeholder)" },
                input: {
                    value: input.value || "",
                    name: input.name || input.id || "sin-nombre",
                    type: input.type || "text",
                    placeholder: input.placeholder || "",
                    id: input.id || "sin-id",
                    disabled: input.disabled || false
                }
            });
            processedInputs.add(input);
        }
    });
}

// 📌 Función Maestra para encadenar estrategias
function getFields() {
    const fields: any[] = [];
    const processedInputs = new Set<HTMLInputElement>();

    // 1. Ejecutamos Estrategia 1 (Div -> Label -> Input)
    strategy1(processedInputs, fields);

    // 2. Si faltan inputs por capturar, fallback a Estrategia 2
    const totalPageInputs = document.querySelectorAll('input').length;
    if (fields.length < totalPageInputs) {
        console.log(`-> Faltan ${totalPageInputs - fields.length} inputs. Probando Estrategia 2...`);
        strategy2(processedInputs, fields);
    }

    return fields;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("-> Mensaje recibido en content.ts:", message);
    if (message.action === 'GET_FIELDS') {
        const fields = getFields();
        sendResponse(fields);
    }
    return true;
});

export { };
