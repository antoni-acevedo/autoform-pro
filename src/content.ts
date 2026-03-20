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

// 📌 Función Maestra para encadenar estrategias EN ORDEN DEL DOM
function getFields() {
    const fields: any[] = [];

    // 1. Buscamos TODOS los inputs en el orden exacto en el que aparecen en la web
    const allInputs = document.querySelectorAll('input, select, textarea');

    allInputs.forEach((input: any) => {
        let labelText = "sin-label";

        if (input.placeholder) {
            labelText = input.placeholder.trim();
        }
        else if (input.id) {
            labelText = input.id;
        }
        else if (input.tagName.toLowerCase() === 'select') {
            const firstOption = input.querySelector('option');
            if (firstOption) {
                labelText = firstOption.textContent?.trim() || "sin-label";
            }
        }

        // 🧪 Estrategia de Emergencia: XPath
        if (labelText === "sin-label") {
            labelText = `XPath(${getXPath(input)})`;
        }


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
            label: { text: labelText },
            input: {
                value: input.value || "",
                name: input.name || input.id || "sin-nombre",
                type: input.type || input.tagName.toLowerCase(),
                placeholder: input.placeholder || "",
                id: input.id || "sin-id",
                disabled: input.disabled || false,
                options: options.length > 0 ? options : undefined // 👈 Añadimos la clave de opciones
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
    return true;
});

export { };
