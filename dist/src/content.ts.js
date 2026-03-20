function strategy1() {
  const getDivs = document.querySelectorAll("div");
  const fields = [];
  const processedInputs = /* @__PURE__ */ new Set();
  let countInputs = 0;
  getDivs.forEach((div) => {
    const label = div.querySelector("label");
    const input = div.querySelector("input");
    if (label && input) {
      countInputs++;
      if (processedInputs.has(input)) return;
      console.log(label.textContent, input.value);
      fields.push({
        label: {
          text: label.textContent?.trim() || ""
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
      processedInputs.add(input);
    }
  });
  return { fields, countInputs };
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("-> Mensaje recibido en content.ts:", message);
  if (message.action === "GET_FIELDS") {
    const fields = strategy1();
    if (fields.countInputs === fields.fields.length) {
      sendResponse(fields);
    } else {
      sendResponse({ fields: [], countInputs: 0 });
    }
  }
  return true;
});
export {};
