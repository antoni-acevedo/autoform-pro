function strategy1() {
    //debemos buscar todos los divs y quedarnos con los que tienen un label y un input dentro
    const getDivs = document.querySelectorAll('div');

    const fields: any[] = [];
    getDivs.forEach((div: any) => {
        const label = div.querySelector('label');
        const input = div.querySelector('input');
        if (label && input) {
            console.log(label.textContent, input.value);
            fields.push({
                label: {
                    text: label.textContent?.trim() || "",
                },
                input: {
                    value: input.value || "",
                    name: input.name || input.id || "sin-nombre",
                    type: input.type || "text",
                    placeholder: input.placeholder || "",
                    id: input.id || "sin-id",
                    disabled: input.disabled || false
                }
            });
        }
    });

    return fields;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("-> Mensaje recibido en content.ts:", message);
    if (message.action === 'GET_FIELDS') {
        const fields = strategy1();
        sendResponse(fields);
    }
    return true;
});

export { };
