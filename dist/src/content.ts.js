function getInputsHTML() {
  const inputs = document.querySelectorAll("input, select, textarea");
  const inputsHTML = Array.from(inputs).map((el) => {
    const input = el;
    console.log(el);
    let returnData = {
      id: input.id,
      name: input.name,
      type: input.type,
      value: input.value,
      placeholder: "placeholder" in input ? input.placeholder : "",
      required: input.required,
      disabled: input.disabled,
      readonly: "readOnly" in input ? input.readOnly : false
    };
    if (input.type === "select-one") {
      returnData.value = input.value || "";
      returnData.options = Array.from(input.options).map((option) => ({
        value: option.value,
        text: option.text,
        selected: option.selected
      }));
    }
    return returnData || {};
  });
  return inputsHTML || [];
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getInputsHTML") {
    const inputsHTML = getInputsHTML();
    sendResponse({ inputsHTML });
  }
});
export {};
