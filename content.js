let sidebarContainer = null;
let sidebarIframe = null;
let observer = null;

// ── Input detection ──────────────────────────────────────────────────────────

// Aria-label values that are meaningless / internal widget labels
const SKIP_LABELS = new Set([
  'buscar', 'search', 'textbox', 'input', 'select', 'seleccionar',
  'combobox', 'dropdown', 'opción', 'option', 'campo', 'field',
  'text', 'texto', 'escribir', 'type here', 'start typing'
]);

function getInputs() {
  const EXCLUDED_TYPES = ['hidden', 'submit', 'button', 'radio', 'checkbox', 'image', 'reset'];

  // ── Inputs ────────────────────────────────────────────────────────
  const inputs = Array.from(document.querySelectorAll('input')).filter(input => {
    const type = (input.type || 'text').toLowerCase();
    if (EXCLUDED_TYPES.includes(type)) return false;

    // Visibility check for all inputs
    const cs = window.getComputedStyle(input);
    const isHidden = cs.display === 'none' || cs.visibility === 'hidden' || input.offsetWidth === 0;

    // Special case for file inputs: they are often hidden but linked to a label
    if (type === 'file') {
      if (isHidden) {
        if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return true;
        const walkedLabel = getBestLabel(input);
        if (walkedLabel && !walkedLabel.startsWith('campo-')) return true;
        return false;
      }
      return true;
    }

    // For other inputs, if hidden, skip
    if (isHidden) return false;

    // Skip inputs inside aria-hidden containers
    if (input.closest('[aria-hidden="true"]')) return false;

    // Skip internal combobox search inputs whose resolved label is generic
    if (input.getAttribute('role') === 'combobox') {
      const resolvedLabel = getBestLabel(input).toLowerCase().trim();
      if (SKIP_LABELS.has(resolvedLabel)) return false;
    }

    return true;
  });

  const inputFields = inputs.map((input, index) => ({
    placeholder: getBestLabel(input, index),
    type: input.type || 'text',
    selector: getUniqueSelector(input, index),
    element: input // Keep reference for sorting
  }));

  // ── Textareas ─────────────────────────────────────────────────────
  const textareaFields = Array.from(document.querySelectorAll('textarea'))
    .filter(ta => {
      if (ta.closest('[aria-hidden="true"]')) return false;
      const cs = window.getComputedStyle(ta);
      if (cs.display === 'none' || cs.visibility === 'hidden' || ta.offsetWidth === 0) return false;
      return true;
    })
    .map((ta, i) => ({
      placeholder: getBestLabel(ta, `ta-${i}`),
      type: 'textarea',
      selector: getUniqueSelector(ta, `ta-${i}`),
      element: ta
    }));

  // Merge and Sort by DOM position
  const allFields = [...inputFields, ...textareaFields];
  allFields.sort((a, b) => {
    const pos = a.element.compareDocumentPosition(b.element);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  // Deduplicate by selector and remove element ref before sending
  const seen = new Set();
  return allFields.filter(f => {
    if (seen.has(f.selector)) return false;
    seen.add(f.selector);
    delete f.element;
    return true;
  });
}


/**
 * Resolves the best human-readable label for an input or textarea.
 * Priority (highest → lowest):
 *   0. Input's own previous siblings (sibling-label pattern like space-y-2)
 *   1. aria-labelledby  (references a real visible label element)
 *   2. <label for="id"> (classic HTML association)
 *   3. aria-label       (only if not in the generic SKIP_LABELS set)
 *   4. DOM ancestor walk (sibling/parent <label> or heading)
 *   5. placeholder      (skip for comboboxes)
 *   6. name attribute
 */
function getBestLabel(input, fallbackIndex) {
  const clean = (str) => (str || '').replace(/\*/g, '').trim();
  const isGood = (txt) => txt && !SKIP_LABELS.has(txt.toLowerCase());

  // 0. INPUT'S OWN previous siblings — catches the common pattern:
  //    <div class="space-y-2"><label>Phone</label><input> ... </div>
  let ownSibling = input.previousElementSibling;
  while (ownSibling) {
    if (ownSibling.tagName === 'LABEL') {
      const txt = clean(ownSibling.innerText);
      if (isGood(txt)) return txt;
    }
    // A span/div directly before the input may wrap the label text
    const innerLbl = ownSibling.querySelector('label');
    if (innerLbl) {
      const txt = clean(innerLbl.innerText);
      if (isGood(txt)) return txt;
    }
    ownSibling = ownSibling.previousElementSibling;
  }

  // 1. aria-labelledby — can reference multiple IDs (space-separated)
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const combined = labelledBy.split(/\s+/)
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .map(el => clean(el.innerText))
      .filter(isGood)
      .join(' ');
    if (combined) return combined;
  }

  // 2. <label for="inputId">
  if (input.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (labelEl) {
      const txt = clean(labelEl.innerText);
      if (isGood(txt)) return txt;
    }
  }

  // 3. aria-label — only if meaningful
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) {
    const txt = clean(ariaLabel);
    if (isGood(txt)) return txt;
  }

  // 4. Walk up the DOM tree looking for a sibling/parent <label> or heading
  let ancestor = input.parentElement;
  for (let depth = 0; depth < 6 && ancestor; depth++) {
    if (ancestor.tagName === 'LABEL') {
      const txt = clean(ancestor.innerText);
      if (isGood(txt)) return txt;
    }
    let sibling = ancestor.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'LABEL') {
        const txt = clean(sibling.innerText);
        if (isGood(txt)) return txt;
      }
      const innerLabel = sibling.querySelector('label, [id$="-label"], [class*="label"]');
      if (innerLabel) {
        const txt = clean(innerLabel.innerText);
        if (isGood(txt)) return txt;
      }
      sibling = sibling.previousElementSibling;
    }
    ancestor = ancestor.parentElement;
  }

  // 5. placeholder — skip for comboboxes and skip if generic
  const ph = input.placeholder;
  if (ph && isGood(ph.toLowerCase().trim()) && input.getAttribute('role') !== 'combobox') {
    return clean(ph);
  }

  // 6. name attribute
  if (input.name && input.name.trim()) return input.name.trim();

  return `campo-${fallbackIndex ?? 0}`;
}



function getUniqueSelector(el, fallbackIndex) {
  const tag = el.tagName.toLowerCase(); // 'input' or 'textarea'
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) return `${tag}[name="${CSS.escape(el.name)}"]`;

  // Build a precise nth-of-type path up to body
  let path = [];
  let current = el;
  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let selector = current.nodeName.toLowerCase();
    const parent = current.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.nodeName === current.nodeName);
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    path.unshift(selector);
    current = current.parentNode;
  }
  return path.length ? path.join(' > ') : `${tag}:nth-of-type(${(fallbackIndex ?? 0) + 1})`;
}


// ── Fill form ────────────────────────────────────────────────────────────────
async function fillForm(data) {
  for (const item of data) {
    const el = document.querySelector(item.selector);
    if (!el) {
      console.warn('[AutoForm] Selector not found:', item.selector);
      continue;
    }

    if (item.type === 'file' && item.fileData) {
      try {
        const blob = await (await fetch(item.fileData.data)).blob();
        const file = new File([blob], item.fileData.name, { type: item.fileData.type });
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
      } catch (e) {
        console.error('[AutoForm] Error adjuntando archivo:', e);
      }
    } else {
      // Works for both <input> and <textarea>
      el.focus();
      el.value = item.value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }
}

// ── Sidebar management ───────────────────────────────────────────────────────

function createSidebar() {
  sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'autoform-sidebar-container';

  sidebarIframe = document.createElement('iframe');
  sidebarIframe.className = 'autoform-sidebar-iframe';
  sidebarIframe.src = chrome.runtime.getURL('sidebar.html');

  sidebarContainer.appendChild(sidebarIframe);
  document.body.appendChild(sidebarContainer);

  // Apply saved position setting before animating
  chrome.storage.sync.get('autoform_settings', result => {
    const settings = result.autoform_settings || { position: 'right' };
    applyPosition(settings.position);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => sidebarContainer.classList.add('active'));
    });
  });

  // Start watching for dynamic fields AFTER sidebar is created
  startObserver();
}

function applyPosition(position) {
  if (!sidebarContainer) return;
  if (position === 'left') {
    sidebarContainer.classList.add('pos-left');
  } else {
    sidebarContainer.classList.remove('pos-left');
  }
}

function toggleSidebar() {
  if (!sidebarContainer) {
    createSidebar();
  } else {
    sidebarContainer.classList.toggle('active');
    if (sidebarContainer.classList.contains('active')) {
      startObserver();
    } else {
      stopObserver();
    }
  }
}

// ── MutationObserver: watch for dynamically loaded inputs ────────────────────
let debounceTimer = null;
function startObserver() {
  if (observer) return; // already running

  observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (sidebarIframe && sidebarIframe.contentWindow) {
        const inputs = getInputs();
        if (inputs.length > 0) {
          sidebarIframe.contentWindow.postMessage(
            { source: 'autoform-contentscript', action: 'INPUTS_RESPONSE', inputs },
            '*'
          );
        }
      }
    }, 400); // debounce 400ms to avoid spam
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// ── Message bridge: sidebar (iframe) <-> content script (page) ───────────────
window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || data.source !== 'autoform-sidebar') return;

  if (data.action === 'GET_INPUTS') {
    const inputs = getInputs();
    sidebarIframe.contentWindow.postMessage(
      { source: 'autoform-contentscript', action: 'INPUTS_RESPONSE', inputs },
      '*'
    );
  }

  if (data.action === 'FILL_FORM') {
    await fillForm(data.data);
    sidebarIframe.contentWindow.postMessage(
      { source: 'autoform-contentscript', action: 'FILL_RESPONSE', success: true },
      '*'
    );
  }

  if (data.action === 'APPLY_SETTINGS' && data.settings) {
    applyPosition(data.settings.position);
  }
});

// ── Chrome runtime messages (from background.js) ─────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TOGGLE_SIDEBAR') {
    toggleSidebar();
    sendResponse({ success: true });
  }
});

// ── Auto-initialize sidebar on load if setting is enabled ────────────────────
const initAutoSidebar = () => {
  chrome.storage.sync.get('autoform_settings', result => {
    if (chrome.runtime.lastError) return;
    const settings = result.autoform_settings;
    if (settings && settings.keepOpen && !sidebarContainer) {
      createSidebar();
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoSidebar);
} else {
  initAutoSidebar();
}
