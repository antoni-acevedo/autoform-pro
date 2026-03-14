document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const fieldsContainer = document.getElementById('fields-container');
  const statusText      = document.getElementById('status-text');
  const fillButton      = document.getElementById('fill-button');
  const rescanButton    = document.getElementById('rescan-button');
  const btnData         = document.getElementById('btn-data');
  const btnSettings     = document.getElementById('btn-settings');
  const dataList        = document.getElementById('data-list');
  const footerCount     = document.getElementById('footer-data-count');
  const btnClearAll     = document.getElementById('btn-clear-all');
  const themeDark       = document.getElementById('theme-dark');
  const themeLight      = document.getElementById('theme-light');
  const posRight        = document.getElementById('pos-right');
  const posLeft         = document.getElementById('pos-left');
  const autofillToggle  = document.getElementById('autofill-toggle');
  const autofillToast   = document.getElementById('autofill-toast');
  const keepOpenToggle  = document.getElementById('keep-open-toggle');

  let detectedInputs = [];
  let currentSettings = { theme: 'dark', position: 'right', autofill: false, keepOpen: false };
  let autoFilledThisPage = false; // prevent double-firing per page load

  // ── Messaging bridge ──────────────────────────────────────────────────────
  function sendToParent(msg) {
    window.parent.postMessage({ source: 'autoform-sidebar', ...msg }, '*');
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'autoform-contentscript') return;

    if (data.action === 'INPUTS_RESPONSE') {
      if (data.inputs && data.inputs.length > 0) {
        detectedInputs = data.inputs;
        statusText.innerText = `${detectedInputs.length} campo${detectedInputs.length > 1 ? 's' : ''} detectado${detectedInputs.length > 1 ? 's' : ''}`;
        fillButton.disabled = false;
        loadAllValues(stored => {
          loadAllFiles(storedFiles => {
            renderFields(detectedInputs, stored, storedFiles);
            // ── AUTOFILL: trigger automatically if enabled and not yet done ──
            if (currentSettings.autofill && !autoFilledThisPage) {
              autoFilledThisPage = true;
              // Small delay so the DOM is ready and fields are rendered
              setTimeout(() => triggerAutoFill(), 600);
            }
          });
        });
      } else {
        statusText.innerText = 'No se detectaron campos';
        fieldsContainer.innerHTML = `
          <div class="empty-state">
            <p>Esperando campos...</p>
            <p class="hint">La extensión detecta automáticamente los campos cuando aparecen en la página.</p>
          </div>`;
        fillButton.disabled = true;
      }
    }

    if (data.action === 'FILL_RESPONSE') {
      fillButton.disabled = false;
      if (data.success) {
        statusText.innerText = '¡Autocompletado!';
        fillButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Éxito`;
        setTimeout(() => {
          fillButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Rellenar Formulario`;
          statusText.innerText = `${detectedInputs.length} campo${detectedInputs.length > 1 ? 's' : ''} detectado${detectedInputs.length > 1 ? 's' : ''}`;
        }, 2500);
      } else {
        fillButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Rellenar Formulario`;
      }
    }
  });

  // ── Autofill toast helper ─────────────────────────────────────────────────────
  function showAutofillToast(msg) {
    autofillToast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> ${msg}`;
    autofillToast.classList.add('visible');
    setTimeout(() => autofillToast.classList.remove('visible'), 5000);
  }

  // ── programmatic fill (used by autofill) ───────────────────────────────────────
  async function triggerAutoFill() {
    const toFill = [];

    // Text/textarea
    const textEls = fieldsContainer.querySelectorAll('input[data-type]:not([data-type="file"]), textarea[data-type]');
    for (const el of textEls) {
      if (el.value.trim()) {
        toFill.push({ selector: el.dataset.selector, type: 'text', value: el.value });
      }
    }

    // Files
    const fileWrappers = fieldsContainer.querySelectorAll('.file-field-wrapper');
    await new Promise(resolve => {
      loadAllFiles(storedFiles => {
        for (const wrapper of fileWrappers) {
          const key = wrapper.dataset.key;
          const selector = wrapper.dataset.selector;
          const hiddenInput = wrapper.querySelector('input[type="file"]');
          if (hiddenInput && hiddenInput.files && hiddenInput.files[0]) {
            // shouldn't happen on page load, but just in case
            resolve();
          } else if (storedFiles[key]) {
            toFill.push({ selector, type: 'file', fileData: storedFiles[key] });
          }
        }
        resolve();
      });
    });

    if (toFill.length === 0) return; // nothing stored yet, skip silently

    sendToParent({ action: 'FILL_FORM', data: toFill });
    showAutofillToast(`¡${toFill.length} campo${toFill.length > 1 ? 's' : ''} rellenado${toFill.length > 1 ? 's' : ''} automáticamente!`);
  }

  // ── View routing ──────────────────────────────────────────────────────────
  function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    // Toggle active state on icon buttons
    btnData.classList.toggle('active', id === 'view-data');
    btnSettings.classList.toggle('active', id === 'view-settings');

    if (id === 'view-data') renderDataView();
  }

  btnData.addEventListener('click', () => {
    const isActive = document.getElementById('view-data').classList.contains('active');
    showView(isActive ? 'view-main' : 'view-data');
  });

  btnSettings.addEventListener('click', () => {
    const isActive = document.getElementById('view-settings').classList.contains('active');
    showView(isActive ? 'view-main' : 'view-settings');
  });

  // Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.target));
  });

  // ── Storage helpers ───────────────────────────────────────────────────────
  function saveValue(key, value) {
    chrome.storage.sync.get('autoform_data', result => {
      const data = result.autoform_data || {};
      data[key] = value;
      chrome.storage.sync.set({ autoform_data: data });
      updateFooterCount(Object.keys(data).length);
    });
  }

  function deleteValue(key) {
    chrome.storage.sync.get('autoform_data', result => {
      const data = result.autoform_data || {};
      delete data[key];
      chrome.storage.sync.set({ autoform_data: data });
      updateFooterCount(Object.keys(data).length);
      renderDataView();
    });
  }

  function loadAllValues(callback) {
    chrome.storage.sync.get('autoform_data', result => {
      const data = result.autoform_data || {};
      updateFooterCount(Object.keys(data).length);
      callback(data);
    });
  }

  // ── File storage (chrome.storage.local — handles large base64 files) ────────
  function saveFileData(key, fileData) {
    chrome.storage.local.get('autoform_files', result => {
      const files = result.autoform_files || {};
      files[key] = fileData; // { name, type, data (base64) }
      chrome.storage.local.set({ autoform_files: files });
    });
  }

  function deleteFileData(key) {
    chrome.storage.local.get('autoform_files', result => {
      const files = result.autoform_files || {};
      delete files[key];
      chrome.storage.local.set({ autoform_files: files });
    });
  }

  function loadAllFiles(callback) {
    chrome.storage.local.get('autoform_files', result => {
      callback(result.autoform_files || {});
    });
  }


  function updateFooterCount(n) {
    footerCount.textContent = `${n} dato${n !== 1 ? 's' : ''} guardado${n !== 1 ? 's' : ''}`;
  }

  // ── Settings storage ──────────────────────────────────────────────────────
  function saveSettings(settings) {
    chrome.storage.sync.set({ autoform_settings: settings });
    applySettings(settings);
    sendToParent({ action: 'APPLY_SETTINGS', settings });
  }

  function applySettings(settings) {
    currentSettings = settings;
    document.documentElement.setAttribute('data-theme', settings.theme);
    themeDark.classList.toggle('active', settings.theme === 'dark');
    themeLight.classList.toggle('active', settings.theme === 'light');
    posRight.classList.toggle('active', settings.position === 'right');
    posLeft.classList.toggle('active', settings.position === 'left');
    // Apply autofill toggle visual state
    if (autofillToggle) autofillToggle.checked = !!settings.autofill;
    if (keepOpenToggle) keepOpenToggle.checked = !!settings.keepOpen;
  }

  function loadSettings(callback) {
    chrome.storage.sync.get('autoform_settings', result => {
      callback(result.autoform_settings || { theme: 'dark', position: 'right', autofill: false, keepOpen: false });
    });
  }

  // ── Settings UI ───────────────────────────────────────────────────────────
  themeDark.addEventListener('click', () => {
    saveSettings({ ...currentSettings, theme: 'dark' });
  });

  themeLight.addEventListener('click', () => {
    saveSettings({ ...currentSettings, theme: 'light' });
  });

  posRight.addEventListener('click', () => {
    saveSettings({ ...currentSettings, position: 'right' });
  });

  posLeft.addEventListener('click', () => {
    saveSettings({ ...currentSettings, position: 'left' });
  });

  // ── Rescan ────────────────────────────────────────────────────────────────
  function requestScan() {
    statusText.innerText = 'Escaneando...';
    sendToParent({ action: 'GET_INPUTS' });
  }

  rescanButton.addEventListener('click', () => {
    rescanButton.style.transform = 'rotate(360deg)';
    rescanButton.style.transition = 'transform 0.5s ease';
    setTimeout(() => { rescanButton.style.transform = ''; rescanButton.style.transition = ''; }, 500);
    requestScan();
  });

  // ── Render fields (main view) ─────────────────────────────────────────────
  function renderFields(inputs, stored, storedFiles = {}) {
    fieldsContainer.innerHTML = '';
    inputs.forEach(input => {
      const key = getCanonicalKey(input.placeholder);
      const group = document.createElement('div');
      group.className = 'input-group';

      const labelRow = document.createElement('div');
      labelRow.className = 'label-row';

      const label = document.createElement('label');
      label.innerText = input.placeholder;

      const badge = document.createElement('span');
      badge.className = 'field-badge';
      badge.innerText = key.replace('custom_', '').replace(/_/g, ' ');
      badge.title = key;

      labelRow.appendChild(label);
      labelRow.appendChild(badge);

      if (input.type === 'file') {
        // ── File field with memory ──────────────────────────────────────────
        const fileWrapper = document.createElement('div');
        fileWrapper.className = 'file-field-wrapper';
        fileWrapper.dataset.selector = input.selector;
        fileWrapper.dataset.key = key;

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.style.display = 'none';
        hiddenInput.id = `file_input_${key}`;

        // Status bar shows stored file or "sin archivo"
        const statusBar = document.createElement('div');
        statusBar.className = 'file-status-bar';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.className = 'file-name';

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'file-clear-btn';
        clearBtn.title = 'Quitar archivo guardado';
        clearBtn.innerHTML = '&times;';

        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'file-pick-btn';
        pickBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Seleccionar`;

        // Helper to update the status bar UI
        function showStoredFile(name) {
          fileNameSpan.textContent = name;
          fileNameSpan.title = name;
          statusBar.classList.add('has-file');
          group.classList.add('prefilled');
        }

        function clearStoredFile() {
          fileNameSpan.textContent = '';
          statusBar.classList.remove('has-file');
          group.classList.remove('prefilled');
          hiddenInput.value = '';
          clearBtn.style.display = 'none';
        }

        // Restore stored file if any
        if (storedFiles[key]) {
          showStoredFile(storedFiles[key].name);
          clearBtn.style.display = 'inline-flex';
        } else {
          clearBtn.style.display = 'none';
        }

        // Pick new file
        pickBtn.addEventListener('click', () => hiddenInput.click());

        hiddenInput.addEventListener('change', async () => {
          const file = hiddenInput.files[0];
          if (!file) return;
          // Convert and save immediately
          const b64 = await fileToBase64(file);
          const fileData = { name: file.name, type: file.type, data: b64 };
          saveFileData(key, fileData);
          showStoredFile(file.name);
          clearBtn.style.display = 'inline-flex';
        });

        clearBtn.addEventListener('click', () => {
          deleteFileData(key);
          clearStoredFile();
        });

        statusBar.appendChild(fileNameSpan);
        statusBar.appendChild(clearBtn);
        fileWrapper.appendChild(hiddenInput);
        fileWrapper.appendChild(pickBtn);
        fileWrapper.appendChild(statusBar);

        group.appendChild(labelRow);
        group.appendChild(fileWrapper);

      } else {
        // ── Text / textarea field ───────────────────────────────────────────
        let inputEl;
        if (input.type === 'textarea') {
          inputEl = document.createElement('textarea');
          inputEl.rows = 3;
        } else {
          inputEl = document.createElement('input');
          inputEl.type = 'text';
        }
        inputEl.placeholder = `Valor para "${input.placeholder}"`;
        if (stored[key]) {
          inputEl.value = stored[key];
          group.classList.add('prefilled');
        }
        inputEl.dataset.selector = input.selector;
        inputEl.dataset.type = input.type;
        inputEl.dataset.key = key;

        inputEl.addEventListener('input', () => {
          if (inputEl.value.trim()) {
            saveValue(key, inputEl.value.trim());
            group.classList.add('prefilled');
          }
        });

        group.appendChild(labelRow);
        group.appendChild(inputEl);
      }

      fieldsContainer.appendChild(group);
    });
  }

  // ── Render DATA view ──────────────────────────────────────────────────────
  function renderDataView() {
    loadAllValues(stored => {
      const entries = Object.entries(stored);
      if (entries.length === 0) {
        dataList.innerHTML = `
          <div class="empty-state">
            <p>No hay datos guardados aún.</p>
            <p class="hint">Rellena campos en cualquier formulario y se guardarán aquí automáticamente.</p>
          </div>`;
        return;
      }

      dataList.innerHTML = '';
      entries
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, value]) => {
          const entry = document.createElement('div');
          entry.className = 'data-entry';

          const header = document.createElement('div');
          header.className = 'data-entry-header';

          const keyBadge = document.createElement('span');
          keyBadge.className = 'data-key-badge';
          keyBadge.innerText = key.replace('custom_', '').replace(/_/g, ' ');

          const actions = document.createElement('div');
          actions.className = 'data-entry-actions';

          // Save button
          const saveBtn = document.createElement('button');
          saveBtn.className = 'btn-icon-sm';
          saveBtn.title = 'Guardar cambio';
          saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

          // Delete button
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-icon-sm delete';
          delBtn.title = 'Eliminar';
          delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>`;

          actions.appendChild(saveBtn);
          actions.appendChild(delBtn);
          header.appendChild(keyBadge);
          header.appendChild(actions);

          const inputEl = document.createElement('input');
          inputEl.type = 'text';
          inputEl.value = value;
          inputEl.placeholder = 'Valor...';

          saveBtn.addEventListener('click', () => {
            saveValue(key, inputEl.value.trim());
            saveBtn.style.color = 'var(--accent)';
            setTimeout(() => saveBtn.style.color = '', 1000);
          });

          delBtn.addEventListener('click', () => {
            if (confirm(`¿Eliminar el campo "${key}"?`)) deleteValue(key);
          });

          entry.appendChild(header);
          entry.appendChild(inputEl);
          dataList.appendChild(entry);
        });
    });
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  btnClearAll.addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos guardados? Esta acción no se puede deshacer.')) {
      chrome.storage.sync.remove('autoform_data', () => {
        updateFooterCount(0);
        renderDataView();
      });
    }
  });

  // ── File helper ───────────────────────────────────────────────────────────
  const fileToBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });

  // ── Fill button ───────────────────────────────────────────────────────────
  fillButton.addEventListener('click', async () => {
    const toFill = [];

    fillButton.disabled = true;
    fillButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Procesando...`;

    // Collect text/textarea fields
    const textInputs = fieldsContainer.querySelectorAll('input[data-type]:not([data-type="file"]), textarea[data-type]');
    for (const el of textInputs) {
      if (el.value.trim()) {
        toFill.push({ selector: el.dataset.selector, type: 'text', value: el.value });
      }
    }

    // Collect file fields — prefer new selection, fall back to stored file
    const fileWrappers = fieldsContainer.querySelectorAll('.file-field-wrapper');
    await loadAllFiles(async storedFiles => {
      for (const wrapper of fileWrappers) {
        const key = wrapper.dataset.key;
        const selector = wrapper.dataset.selector;
        const hiddenInput = wrapper.querySelector('input[type="file"]');

        if (hiddenInput && hiddenInput.files && hiddenInput.files[0]) {
          // New file selected this session
          const file = hiddenInput.files[0];
          const b64 = await fileToBase64(file);
          toFill.push({ selector, type: 'file', fileData: { name: file.name, type: file.type, data: b64 } });
        } else if (storedFiles[key]) {
          // Use stored file from previous session
          toFill.push({ selector, type: 'file', fileData: storedFiles[key] });
        }
      }

      if (toFill.length === 0) {
        alert('Por favor rellena al menos un campo.');
        fillButton.disabled = false;
        fillButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Rellenar Formulario`;
        return;
      }

      sendToParent({ action: 'FILL_FORM', data: toFill });
    });
  });

  // ── Field map + canonical key ─────────────────────────────────────────────
  const FIELD_MAP = {
    first_name: ['first name','nombre','firstname','given name','nombre de pila','first_name','fname','your first name','primer nombre'],
    last_name: ['last name','apellido','apellidos','lastname','surname','family name','last_name','lname','your last name','segundo nombre'],
    name: ['name','full name','nombre completo','your name','fullname','full_name','nombre y apellido','first and last name','applicant name','candidate name','_systemfield_name'],
    email: ['email','correo','e-mail','correo electrónico','correo electronico','mail','email address','your email','_systemfield_email','work email'],
    phone: ['phone','teléfono','telefono','phone number','número de teléfono','numero de telefono','mobile','cel','celular','cell','contact number','tel'],
    linkedin: ['linkedin','linkedin url','linkedin profile','perfil de linkedin','enlace de linkedin','linkedin link'],
    github: ['github','github url','github profile','github link'],
    portfolio: ['portfolio','portfolio url','website','sitio web','personal website','enlace al sitio web','personal site'],
    location: ['location','ubicación','ubicacion','ciudad','city','país','pais','where are you located','city/state','region','_systemfield_location'],
    salary: ['salary','salario','expected salary','salario esperado','salary expectation','compensation','desired salary','monthly','annual salary'],
    notice_period: ['notice period','período de aviso','preaviso','when can you start','earliest start date'],
    cover_letter: ['cover letter','carta de presentación','carta de presentacion','motivation letter','about you','additional information'],
    university: ['university','universidad','school','college','institution','education','educación'],
    degree: ['degree','título','titulo','major','field of study','carrera'],
    company: ['company','empresa','current company','employer','organization'],
    title: ['title','cargo','job title','current title','position','puesto','current position','role'],
    years_experience: ['years of experience','años de experiencia','experience','experiencia']
  };

  const normalize = str => (str || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[_\-]/g, ' ');

  function getCanonicalKey(label) {
    const n = normalize(label);
    for (const [key, aliases] of Object.entries(FIELD_MAP)) {
      for (const a of aliases) if (n === a) return key;
    }
    for (const [key, aliases] of Object.entries(FIELD_MAP)) {
      for (const a of aliases) if (n.startsWith(a + ' ') || a === n) return key;
    }
    for (const [key, aliases] of Object.entries(FIELD_MAP)) {
      for (const a of aliases) if (a.length >= 4 && n.includes(a)) return key;
    }
    return 'custom_' + n.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  loadSettings(settings => {
    applySettings(settings);
    // Restore autofill toggle state
    autofillToggle.checked = !!settings.autofill;
    requestScan();
  });

  // Save autofill preference when toggled
  autofillToggle.addEventListener('change', () => {
    saveSettings({ ...currentSettings, autofill: autofillToggle.checked });
    // Reset per-page flag so it can trigger on next rescan if enabled
    if (autofillToggle.checked) autoFilledThisPage = false;
  });

  // Save keepOpen preference when toggled
  keepOpenToggle.addEventListener('change', () => {
    saveSettings({ ...currentSettings, keepOpen: keepOpenToggle.checked });
  });

});
