let sidebarContainer = null;
let sidebarIframe = null;
let observer = null;

// ── Input detection ──────────────────────────────────────────────────────────

// Aria-label values that are meaningless / internal widget labels
const SKIP_LABELS = new Set([
  'buscar', 'search', 'textbox', 'input', 'select', 'seleccionar',
  'combobox', 'dropdown', 'opción', 'option', 'campo', 'field',
  'text', 'texto', 'escribir', 'type here', 'start typing',
  'selecciona el código del país', 'código del país', 'country code',
  'type to search', 'search for', 'filter', 'buscar'
]);

function getInputs(deleteRef = true) {
  const EXCLUDED_TYPES = ['hidden', 'submit', 'button', 'image', 'reset'];

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
        const labelForId = input.closest('form, div, section')?.querySelector(`label[for]`);
        if (labelForId) {
          const forId = labelForId.getAttribute('for');
          const referencedInput = document.getElementById(forId);
          if (referencedInput === input) return true;
        }
        const walkedLabel = getBestLabel(input);
        if (walkedLabel && !walkedLabel.startsWith('campo-')) return true;
        return false;
      }
      return true;
    }

    if (isHidden) {
      if (type === 'radio' || type === 'checkbox') {
        const parentFieldset = input.closest('fieldset');
        const hasSiblingsName = input.name && Array.from(document.querySelectorAll(`input[name="${CSS.escape(input.name)}"]`)).filter(i => i !== input).length > 0;
        if (parentFieldset || hasSiblingsName) return true;
      }
      return false;
    }

    if (input.closest('[aria-hidden="true"]')) return false;

    if (input.getAttribute('role') === 'combobox') {
      const resolvedLabel = getBestLabel(input).toLowerCase().trim();
      if (SKIP_LABELS.has(resolvedLabel)) return false;
      if (resolvedLabel.includes('código') || resolvedLabel.includes('country code') || 
          resolvedLabel.includes('selecciona') || resolvedLabel.includes('seleccionar')) return false;
      if (input.closest('.select-module_select-wrapper')) return false;
    }

    return true;
  });

  const standardInputs = [];
  const radioGroups = {};

  inputs.forEach((input, index) => {
    const type = (input.type || 'text').toLowerCase();
    const label = getBestLabel(input, index);

    // Recalculate visibility for setting CustomDropdown flags
    const cs = window.getComputedStyle(input);
    const isHidden = cs.display === 'none' || cs.visibility === 'hidden' || input.offsetWidth === 0;

    if (type === 'radio') {
      const parentFieldset = input.closest('fieldset');
      let groupLabel = label;
      if (parentFieldset) {
        const legend = parentFieldset.querySelector('legend');
        if (legend) groupLabel = legend.innerText.trim().replace(/\*/g, '').trim();
      }
      const name = input.name || `radio-group-${index}`;
      if (!radioGroups[name]) {
        radioGroups[name] = {
          placeholder: groupLabel,
          type: 'radio',
          isCustomDropdown: false,
          options: []
        };
      }
      
      if (isHidden || input.closest('[data-controller*="dropdown"]')) {
        radioGroups[name].isCustomDropdown = true;
      }

      radioGroups[name].options.push({
        label: label,
        value: input.value,
        selector: getUniqueSelector(input, index)
      });
    } else {
      standardInputs.push({
        placeholder: label,
        type: type,
        selector: getUniqueSelector(input, index),
        element: input
      });
    }
  });

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

  // ── Selects ──────────────────────────────────────────────────
  const selectFields = Array.from(document.querySelectorAll('select'))
    .filter(select => {
      if (select.closest('[aria-hidden="true"]')) return false;
      const cs = window.getComputedStyle(select);
      if (cs.display === 'none' || cs.visibility === 'hidden' || select.offsetWidth === 0) return false;
      const label = getBestLabel(select).toLowerCase().trim();
      if (SKIP_LABELS.has(label)) return false;
      return true;
    })
    .map((select, i) => ({
      placeholder: getBestLabel(select, `sel-${i}`),
      type: 'select',
      selector: getUniqueSelector(select, `sel-${i}`),
      element: select,
      options: Array.from(select.options).map(o => ({ value: o.value, text: o.text || o.innerText }))
    }));

  // Combine components and group
  const radioFields = Object.values(radioGroups);
  const allFields = [...standardInputs, ...radioFields, ...textareaFields, ...selectFields];

  allFields.sort((a, b) => {
    const elA = a.element || (a.options && a.options[0] ? document.querySelector(a.options[0].selector) : null);
    const elB = b.element || (b.options && b.options[0] ? document.querySelector(b.options[0].selector) : null);
    if (elA && elB) {
      const pos = elA.compareDocumentPosition(elB);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    }
    return 0;
  });

  // Deduplicate by selector and remove element ref before sending
  const seen = new Set();
  return allFields.filter(f => {
    const selector = f.selector || (f.options && f.options[0] ? f.options[0].selector : null);
    if (!selector) return true;
    if (seen.has(selector)) return false;
    seen.add(selector);
    if (deleteRef) delete f.element;
    return true;
  });
}


/**
 * Resolves the best human-readable label for an input or textarea.
 * Priority (highest → lowest):
 *   0. Input's own siblings (common with radio/checkbox: input then label)
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

  // 0. INPUT'S OWN siblings — catches both preceding label and following label
  // preceding label: <label>Phone</label><input>
  // following label: <input type="checkbox"><label>I accept</label>
  let sib = input.previousElementSibling;
  while (sib) {
    if (sib.tagName === 'LABEL') {
      const txt = clean(sib.innerText);
      if (isGood(txt)) return txt;
    }
    const innerLbl = sib.querySelector('label');
    if (innerLbl) {
      const txt = clean(innerLbl.innerText);
      if (isGood(txt)) return txt;
    }
    sib = sib.previousElementSibling;
  }

  sib = input.nextElementSibling;
  while (sib) {
    if (sib.tagName === 'LABEL') {
      const txt = clean(sib.innerText);
      if (isGood(txt)) return txt;
    }
    const innerLbl = sib.querySelector('label');
    if (innerLbl) {
      const txt = clean(innerLbl.innerText);
      if (isGood(txt)) return txt;
    }
    sib = sib.nextElementSibling;
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

  // 4. Walk up the DOM tree looking for a sibling/parent <label>, <legend>, or heading
  let ancestor = input.parentElement;
  for (let depth = 0; depth < 8 && ancestor; depth++) {
    // Check if we found a fieldset with a legend
    if (ancestor.tagName === 'FIELDSET') {
      const legend = ancestor.querySelector('legend');
      if (legend) {
        const txt = clean(legend.innerText);
        if (isGood(txt)) return txt;
      }
    }
    
    if (ancestor.tagName === 'LABEL' || ancestor.tagName === 'LEGEND') {
      const txt = clean(ancestor.innerText);
      if (isGood(txt)) return txt;
    }

    // Search siblings (both directions)
    const scanSiblings = (startNode) => {
      let sib = startNode;
      while (sib) {
        if (sib.tagName === 'LABEL' || sib.tagName === 'LEGEND') {
          const txt = clean(sib.innerText);
          if (isGood(txt)) return txt;
        }
        const innerLabel = sib.querySelector('label, legend, [id$="-label"], .form-label-inner, [class*="label"]');
        if (innerLabel) {
          const txt = clean(innerLabel.innerText);
          if (isGood(txt)) return txt;
        }
        
        // Also check if the sibling is just a text node containing the label
        if (sib.classList?.contains('form-label-inner')) {
           const txt = clean(sib.innerText);
           if (isGood(txt)) return txt;
        }
        
        return null; // Just do adjacent siblings if we want to be safe, or iterate all
      }
    };

    // Check adjacent siblings first
    let prev = ancestor.previousElementSibling;
    if (prev) {
      const txt = scanSiblings(prev);
      if (txt) return txt;
    }

    let nxt = ancestor.nextElementSibling;
    if (nxt) {
      const txt = scanSiblings(nxt);
      if (txt) return txt;
    }

    // Stop traversing if we hit a layout row or fieldset (prevents leaking to other questions)
    if (ancestor.classList?.contains('row') || ancestor.classList?.contains('form-group') || ancestor.tagName === 'FIELDSET') {
       // Search within the whole ancestor container before giving up
       const within = ancestor.querySelector('.form-label-inner, label, legend');
       if (within && isGood(clean(within.innerText))) {
          return clean(within.innerText);
       }
       break; // Do not go up into row grids to avoid picking up previous column names
    }

    ancestor = ancestor.parentElement;
  }

  // 5. placeholder — skip for comboboxes and skip if generic
  const ph = input.placeholder;
  if (ph && input.getAttribute('role') !== 'combobox') {
    const phLower = ph.toLowerCase().trim();
    if (phLower && !SKIP_LABELS.has(phLower)) {
      return clean(ph);
    }
  }

  // 5b. Also check data-test-id as fallback
  const dataTestId = input.getAttribute('data-test-id');
  if (dataTestId) {
    // Extract meaningful part from test ID like "Informaci_n_de_contacto_phone"
    const cleaned = dataTestId
      .replace(/^Informaci_n_de_contacto_/, '')
      .replace(/^Preguntas_sobre_la_solicitud_/, '')
      .replace(/^Preguntas_espec_ficas_sobre_el_puesto_/, '')
      .replace(/_/g, ' ')
      .toLowerCase();
    if (isGood(cleaned)) return cleaned;
  }

  // 6. name attribute
  if (input.name && input.name.trim()) return input.name.trim();

  // 7. Special case for phone inputs - check if inside phone fieldset
  const parentFieldset = input.closest('fieldset');
  if (parentFieldset) {
    const legend = parentFieldset.querySelector('legend');
    if (legend) {
      const txt = clean(legend.innerText);
      if (isGood(txt)) return txt;
    }
  }

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

    const tagName = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();

    if (type === 'file' && item.fileData) {
      try {
        const blob = await (await fetch(item.fileData.data)).blob();
        const file = new File([blob], item.fileData.name, { type: item.fileData.type });
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
      } catch (e) {
        console.error('[AutoForm] Error adjuntando archivo:', e);
      }
    } else if (tagName === 'select') {
      el.focus();
      el.value = item.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (type === 'checkbox') {
      el.focus();
      const shouldCheck = item.value === 'true' || item.value === '1' || item.value === 'on' || item.value === el.value;
      el.checked = shouldCheck;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (type === 'radio') {
      if (item.value === 'true' || item.value === '1' || item.value === el.value) {
        el.focus();
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // Support for custom-built visual dropdowns backed by radios (e.g. Stimulus)
        const parentNode = el.closest('.question') || el.closest('fieldset') || el.closest('[data-controller]');
        const trigger = parentNode?.querySelector(`[data-value="${CSS.escape(el.value)}"]`);
        if (trigger && typeof trigger.click === 'function') {
          trigger.click();
        }
      }
    } else {
      // Works for both <input> and <textarea>
      el.focus();
      el.value = item.value;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }
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

function syncFormToStorage() {
  const fields = getInputs(false); // Do not delete element reference
  const updates = {};
  let count = 0;

  fields.forEach(f => {
    // Generate the exact same key format as sidebar.js
    const key = f.placeholder ? 
      f.placeholder.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') : 
      null;

    if (!key) return;

    if (f.type === 'radio') {
      if (f.options) {
        f.options.forEach(opt => {
          const radioNode = document.querySelector(opt.selector);
          if (radioNode && radioNode.checked) {
            updates[key] = opt.value;
            count++;
          }
        });
      }
    } else if (f.type === 'checkbox') {
      if (f.element && f.element.checked) {
        updates[key] = 'true';
        count++;
      }
    } else if (f.type === 'select') {
      if (f.element && f.element.value) {
        updates[key] = f.element.value;
        count++;
      }
    } else { // text, textarea
      if (f.element && f.element.value && f.element.value.trim()) {
        updates[key] = f.element.value.trim();
        count++;
      }
    }
  });

  if (count > 0) {
    chrome.storage.sync.set(updates, () => {
      console.log('[AutoForm] Sincronización completa:', updates);
      sidebarIframe?.contentWindow?.postMessage({ 
        source: 'autoform-contentscript', 
        action: 'SYNC_DONE', 
        count: count 
      }, '*');
    });
  } else {
    sidebarIframe?.contentWindow?.postMessage({ 
      source: 'autoform-contentscript', 
      action: 'SYNC_DONE', 
      count: 0 
    }, '*');
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

  if (data.action === 'SYNC_FORM') {
    syncFormToStorage();
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
