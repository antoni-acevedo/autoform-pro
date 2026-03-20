function strategy1(processedInputs, fields) {
  const getDivs = document.querySelectorAll("div");
  getDivs.forEach((div) => {
    const label = div.querySelector("label");
    const input = div.querySelector("input");
    if (label && input) {
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
function strategy2(processedInputs, fields) {
  const allInputs = document.querySelectorAll("input");
  allInputs.forEach((input) => {
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
function getFields() {
  const fields = [];
  const processedInputs = /* @__PURE__ */ new Set();
  strategy1(processedInputs, fields);
  const totalPageInputs = document.querySelectorAll("input").length;
  if (fields.length < totalPageInputs) {
    console.log(`-> Faltan ${totalPageInputs - fields.length} inputs. Probando Estrategia 2...`);
    strategy2(processedInputs, fields);
  }
  return fields;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("-> Mensaje recibido en content.ts:", message);
  if (message.action === "GET_FIELDS") {
    const fields = getFields();
    sendResponse(fields);
  }
  return true;
});
export {};
