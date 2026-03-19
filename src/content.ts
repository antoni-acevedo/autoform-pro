/**
 * 🌐 CONTENT SCRIPT (Inyectado en la página)
 * ------------------------------------------
 * Este archivo se ejecuta DENTRO de la página web que el usuario está visitando.
 * Tiene acceso total al DOM (HTML) y puede interactuar con la página.
 * 
 * CARACTERÍSTICAS:
 * - Puede leer y modificar el HTML (document.body, etc.).
 * - Puede escuchar eventos del usuario (clics, teclado).
 * - Se ejecuta en un "sandbox" separado del navegador, por seguridad.
 * - Se comunica con el Background Script para enviar datos o recibir órdenes.
 */

interface InputData {
    id: string;
    name: string;
    type: string;
    value: string;
    placeholder: string;
    required: boolean;
    disabled: boolean;
    readonly: boolean;
    options?: { value: string; text: string; selected: boolean }[];
}

function getInputsHTML() {
    const inputs = document.querySelectorAll('input, select, textarea');
    const inputsHTML = Array.from(inputs).map((el: Element) => {
        const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

        console.log(el);

        let returnData: InputData = {
            id: input.id,
            name: input.name,
            type: input.type,
            value: input.value,
            placeholder: 'placeholder' in input ? input.placeholder : '',
            required: input.required,
            disabled: input.disabled,
            readonly: 'readOnly' in input ? input.readOnly : false,
        }

        if (input.type === 'select-one') {
            returnData.value = input.value || '';
            returnData.options = Array.from<HTMLOptionElement>((input as unknown as HTMLSelectElement).options).map((option) => ({
                value: option.value,
                text: option.text,
                selected: option.selected,
            }));

        }

        return returnData || {};

    });
    return inputsHTML || [];
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getInputsHTML') {
        const inputsHTML = getInputsHTML();
        sendResponse({ inputsHTML });
    }
});




export { };
