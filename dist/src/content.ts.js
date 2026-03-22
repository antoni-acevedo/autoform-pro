function getXPath(element) {
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
function fillElementValue(element, value) {
  try {
    if (element.type === "checkbox") {
      const isChecked = value === "true" || value === "on" || value === true;
      if (element.checked !== isChecked) {
        element.click();
      }
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
      if (element.tagName === "SELECT" && element.options) {
        for (let i = 0; i < element.options.length; i++) {
          if (element.options[i].value === value || element.options[i].textContent?.trim() === value) {
            element.selectedIndex = i;
            break;
          }
        }
      }
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.warn("-> Error al usar setter nativo, cayendo en fallback:", error);
    if (element.type === "checkbox") {
      element.checked = value === "true" || value === "on";
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
function getLabelInfo(input) {
  if (input.placeholder) {
    return { text: input.placeholder.trim(), method: "placeholder" };
  }
  if (input.id) {
    return { text: input.id, method: "id" };
  }
  return { text: getXPath(input), method: "xpath" };
}
function getFields() {
  const fields = [];
  const allInputs = document.querySelectorAll("input, select, textarea");
  Array.from(allInputs).forEach((input, domIndex) => {
    if (input.type === "file") return;
    const info = getLabelInfo(input);
    const options = [];
    if (input.tagName.toLowerCase() === "select") {
      input.querySelectorAll("option").forEach((opt) => {
        options.push({
          value: opt.value || "",
          text: opt.textContent?.trim() || ""
        });
      });
    }
    fields.push({
      label: info,
      input: {
        value: input.type === "checkbox" ? String(input.checked) : input.value || "",
        name: input.name || "",
        type: input.type || input.tagName.toLowerCase(),
        placeholder: input.placeholder || "",
        id: input.id || "",
        className: input.className || "",
        // Para trackear selects/checkbox sin nombre
        domIndex,
        // Orden en el árbol
        disabled: input.disabled || false,
        options: options.length > 0 ? options : void 0
      }
    });
  });
  return fields;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("-> Mensaje recibido en content.ts:", message);
  if (message.action === "GET_FIELDS") {
    const fields = getFields();
    sendResponse(fields);
  } else if (message.action === "FILL_FIELDS") {
    const data = message.data || [];
    data.forEach((savedField) => {
      const targetLabel = savedField.label.text;
      const targetMethod = savedField.label.method;
      const valueToSet = savedField.input.value;
      let current = null;
      let highestScore = 0;
      const allInputs = document.querySelectorAll("input, select, textarea");
      const candidates = Array.from(allInputs);
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.type === "file") continue;
        let score = 0;
        if (savedField.input.id && candidate.id === savedField.input.id) score += 100;
        if (savedField.input.name && candidate.name === savedField.input.name) score += 90;
        if (targetMethod === "placeholder" && candidate.placeholder === targetLabel) score += 80;
        if (targetMethod === "id" && candidate.id === targetLabel) score += 80;
        if (savedField.input.type && candidate.type === savedField.input.type) score += 10;
        if (savedField.input.className && candidate.className === savedField.input.className) score += 20;
        if (savedField.input.domIndex !== void 0 && i === savedField.input.domIndex) score += 5;
        if (candidate.tagName === "SELECT" && savedField.input.options) {
          const candidateOptions = Array.from(candidate.querySelectorAll("option")).map((o) => o.textContent?.trim());
          const savedOptions = savedField.input.options.map((o) => o.text);
          if (JSON.stringify(candidateOptions) === JSON.stringify(savedOptions)) {
            score += 30;
          }
        }
        if (score > highestScore && score >= 20) {
          highestScore = score;
          current = candidate;
        }
      }
      if (!current && targetMethod === "xpath") {
        try {
          let cleanXpath = targetLabel.replace(/^XPath\(/, "").replace(/\)$/, "");
          current = document.evaluate(cleanXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
          console.warn("Fallback de XPath falló:", e);
        }
      }
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
export {};
