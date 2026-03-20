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

        // 🟢 Estrategia 1: Buscar <label for="id"> (Nativa HTML) o en el contenedor DIV cercano
        let label: any = null;
        
        if (input.id) {
            label = document.querySelector(`label[for="${input.id}"]`);
        }

        if (!label) {
            const closestParent = input.closest('div');
            label = closestParent ? closestParent.querySelector('label') : null;
        }

        const labelTextFromDOM = label ? label.textContent?.trim() : "";

        if (labelTextFromDOM) {
            labelText = labelTextFromDOM;
        }
        // 🟠 Estrategia 2: ID o Nombre si no hay <label> con texto
        else if (input.id || input.name) {
            labelText = input.id || input.name;
        }
        // 🟡 Estrategia 3: Placeholder si no hay ID/Nombre
        else if (input.placeholder) {
            labelText = input.placeholder.trim();
        }
        // 🟢 Estrategia 4: Value si no hay Placeholder (excluyendo Checkboxes)
        else if (input.value && input.type !== "checkbox") {
            labelText = input.value;
        }
        // 🔵 Estrategia 5: Fallback para Selects (primera opción)
        else if (input.tagName.toLowerCase() === 'select') {
            const firstOption = input.querySelector('option');
            if (firstOption) {
                labelText = firstOption.textContent?.trim() || "sin-label";
            }
        }

        // 🟢 Estrategia 5 (De emergencia para Checkboxes sin nada)
        if (labelText === "sin-label" && input.type === "checkbox") {
            labelText = `Checkbox(${getXPath(input)})`;
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
            xpath: getXPath(input), // 👈 Añadimos XPath para que se pueda copiar en el UI
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
