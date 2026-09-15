(() => {
  const STORAGE_KEY = 'rr_client_ecosystem_validation_v1';
  const form = document.getElementById('validation-form');
  const clearButton = document.getElementById('clear-validation');
  const saveStatus = document.getElementById('save-status');
  const toast = document.getElementById('toast');
  let toastTimer;

  function formSnapshot() {
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formSnapshot()));
    saveStatus.textContent = 'Responses saved in this browser.';
  }

  function restore() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { saved = {}; }
    for (const [name, value] of Object.entries(saved)) {
      const field = form.elements.namedItem(name);
      if (!field) continue;
      if (field instanceof RadioNodeList) {
        for (const option of field) option.checked = option.value === value;
      } else {
        field.value = value;
      }
    }
  }

  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function exportValidation(event) {
    event.preventDefault();
    save();
    const payload = {
      schemaVersion: '1.0',
      type: 'rr-client-ecosystem-validation',
      ecosystemVersion: '0.3',
      exportedAt: new Date().toISOString(),
      source: window.location.href,
      responses: formSnapshot()
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rr-client-validation-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    notify('Validation exported. Please send the JSON file to the R&R team.');
  }

  form.addEventListener('input', save);
  form.addEventListener('change', save);
  form.addEventListener('submit', exportValidation);
  clearButton.addEventListener('click', () => {
    form.reset();
    localStorage.removeItem(STORAGE_KEY);
    saveStatus.textContent = 'Responses cleared from this browser.';
    notify('Client validation responses cleared.');
  });

  restore();
})();
