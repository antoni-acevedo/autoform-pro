import { createHotContext as __vite__createHotContext } from "/vendor/vite-client.js"; import.meta.hot = __vite__createHotContext("/src/content.css.js"); import { updateStyle as __vite__updateStyle, removeStyle as __vite__removeStyle } from "/vendor/vite-client.js"
const __vite__id = "/mnt/windows/Users/Admin/Desktop/ProyectosPersonales/autoFormPro/src/content.css"
const __vite__css = "/* Styles injected through content.css in src */\n\n.ext-pro-marker {\n  animation: glow-fade 1.5s ease-out;\n  box-shadow: 0 0 10px rgba(124, 77, 255, 0.4);\n  background: rgba(124, 77, 255, 0.05);\n  border: 1px dashed #7c4dff;\n}\n\n@keyframes glow-fade {\n  0% { opacity: 0; filter: blur(4px); transform: scale(0.95); }\n  50% { opacity: 1; filter: blur(0px); transform: scale(1.02); }\n  100% { opacity: 0; filter: blur(2px); transform: scale(1); }\n}\n"
__vite__updateStyle(__vite__id, __vite__css)
import.meta.hot.accept()
import.meta.hot.prune(() => __vite__removeStyle(__vite__id))