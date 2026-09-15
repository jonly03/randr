const root = document.querySelector('#root');
const isOperational = root.dataset.runtimeMode === 'operational';
const state = { glassType: null, vehiclePathComplete: false, ymm: null, data: null };
let lastRetry = null;

const oauth = isOperational ? new RROAuth.BrowserOAuthClient({
  clientId: root.dataset.oauthClientId,
  redirectUri: `${window.location.origin}/oauth/callback`
}) : null;
const api = isOperational ? new RRApi.LookupApiClient({ tokenProvider: () => oauth.getAccessToken() }) : null;

function workflowSnapshot() {
  return { glassType: state.glassType, vehiclePathComplete: state.vehiclePathComplete, ymm: state.ymm };
}

function restoreWorkflow(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  state.glassType = ['Windshield', 'Back Glass', 'Door Glass'].includes(snapshot.glassType) ? snapshot.glassType : null;
  state.vehiclePathComplete = Boolean(snapshot.vehiclePathComplete);
  state.ymm = snapshot.ymm && typeof snapshot.ymm === 'object' ? snapshot.ymm : null;
}

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar py-3"><div class="container workflow d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3"><div class="brand-mark">R&amp;R</div><div><div class="brand-name">Finest Auto Glass</div><div class="brand-sub">Service Intake</div></div></div>
      <div class="d-flex align-items-center gap-3"><span id="environment-badge" class="badge rounded-pill demo-pill px-3 py-2"></span><a class="small text-decoration-none d-none d-lg-inline" href="whats-new.html">What’s New</a><a class="small text-decoration-none d-none d-md-inline" href="blueprint.html">Blueprint</a><a class="small text-decoration-none" href="board.html">Delivery Board</a></div>
    </div></header>
    <main class="container workflow py-4 py-md-5"><div class="mb-4">
      <div class="d-flex justify-content-between align-items-end mb-3"><div><div class="eyebrow mb-1">NEW SERVICE REQUEST</div><h1 class="h3 mb-0">Identify the correct glass</h1></div><span class="text-secondary small d-none d-md-inline">Request #RR-1048</span></div>
      <div class="stepper" aria-label="Request progress"><div class="step active" data-step="glass"><span>1</span>Glass type</div><div class="step" data-step="vehicle"><span>2</span>Vehicle</div><div class="step" data-step="parts"><span>3</span>Parts</div><div class="step" data-step="quote"><span>4</span>Quote</div></div>
    </div><section class="card main-card"><div class="card-accent"></div><div class="card-body p-4 p-md-5"><div id="content"></div></div></section><p id="environment-note" class="text-center text-secondary small mt-4"></p></main>
  </div>`;

const content = document.querySelector('#content');
const badge = document.querySelector('#environment-badge');
const environmentNote = document.querySelector('#environment-note');

function updateEnvironmentLabel() {
  if (!isOperational) {
    badge.textContent = '● Static Demo · Public mock data';
    environmentNote.textContent = 'Public prototype data only · No customer information is stored';
    return;
  }
  badge.textContent = oauth.isAuthenticated() ? '● Secure API · Connected' : '○ Secure API · Not connected';
  badge.classList.toggle('secure-connected', oauth.isAuthenticated());
  environmentNote.textContent = 'Operational demo · Requests use the authenticated Express API';
}

function setSteps(current) {
  const order = ['glass', 'vehicle', 'parts', 'quote']; const at = order.indexOf(current);
  document.querySelectorAll('.step').forEach((el, i) => { el.className = `step ${i < at ? 'complete' : i === at ? 'active' : ''}`; el.querySelector('span').textContent = i < at ? '✓' : i + 1; });
}

async function getStaticData() {
  if (state.data) return state.data;
  const response = await fetch('mock-server/lookup-data.json');
  if (!response.ok) throw new Error('Public mock data is unavailable.');
  state.data = await response.json();
  return state.data;
}

function renderConnection({ message, tone = 'info', retryLabel = 'Connect secure demo' } = {}) {
  setSteps('glass'); updateEnvironmentLabel();
  content.innerHTML = `<div class="text-center py-4 py-md-5 connection-panel"><div class="connection-icon" aria-hidden="true">🔒</div><div class="eyebrow mb-2">SECURE OPERATIONAL DEMO</div><h2 class="h4">Connect to the R&amp;R API</h2><p class="text-secondary mx-auto" style="max-width:560px">Authorize this browser with OAuth 2.0 and PKCE before looking up vehicle or glass information.</p>${message ? `<div class="alert alert-${tone} text-start mx-auto" style="max-width:620px" role="alert">${escapeHtml(message)}</div>` : ''}<button class="btn btn-primary px-4" id="connect-api">${retryLabel}</button><div class="small text-secondary mt-3">The access token stays in memory and is cleared when this page is refreshed or closed.</div></div>`;
  document.querySelector('#connect-api').onclick = () => oauth.startAuthorization(workflowSnapshot());
}

function renderGlass() {
  setSteps('glass'); updateEnvironmentLabel();
  content.innerHTML = `<div class="text-center mb-4"><div class="eyebrow mb-2">STEP 1 OF 4</div><h2 class="h4">What type of glass needs service?</h2><p class="text-secondary mb-0">Choose one option to begin the vehicle lookup.</p></div><div class="row g-3 justify-content-center">${[['Windshield', '▱', 'Front vehicle glass'], ['Back Glass', '▰', 'Rear vehicle glass'], ['Door Glass', '▯', 'Side door glass']].map(([name, icon, desc]) => `<div class="col-md-4"><button class="glass-option w-100" data-glass="${name}"><span class="glass-icon">${icon}</span><strong class="d-block">${name}</strong><small class="text-secondary">${desc}</small></button></div>`).join('')}</div>`;
  document.querySelectorAll('[data-glass]').forEach(btn => btn.addEventListener('click', () => { state.glassType = btn.dataset.glass; state.vehiclePathComplete = false; state.ymm = null; renderLookup(); }));
}

async function renderLookup() {
  setSteps('vehicle'); const door = state.glassType === 'Door Glass';
  content.innerHTML = `<button class="btn btn-link px-0 text-decoration-none small mb-3" id="back">← Change glass type</button><div class="row g-4"><div class="col-lg-7"><div class="eyebrow mb-2">${door ? 'DOOR GLASS LOOKUP' : 'VIN LOOKUP'}</div><h2 class="h4 mb-2">${door ? 'First, identify the vehicle' : 'Enter the vehicle VIN'}</h2><p class="text-secondary">${door ? 'MyGrant requires Year, Make, and Model before the VIN search for door glass.' : 'We’ll use the VIN to identify the vehicle and retrieve compatible glass.'}</p><div id="lookup-form"></div></div><div class="col-lg-5"><div class="helper-panel p-4"><strong class="d-block mb-2">Selected service</strong><div class="h5 mb-2">${state.glassType}</div><small class="text-secondary">${door ? 'Lookup path: Year → Make → Model → VIN' : 'Lookup path: VIN → compatible parts'}</small></div></div></div>`;
  document.querySelector('#back').onclick = renderGlass;
  if (door && !(state.vehiclePathComplete && state.ymm)) await renderYmm(); else renderVin(state.ymm);
}

async function catalogYears() { return isOperational ? api.getYears() : (await getStaticData()).catalog.years; }
async function catalogMakes(year) { return isOperational ? api.getMakes(year) : (await getStaticData()).catalog.makes[year] || []; }
async function catalogModels(year, make) { return isOperational ? api.getModels(year, make) : (await getStaticData()).catalog.models[`${year}|${make}`] || []; }

async function renderYmm() {
  const form = document.querySelector('#lookup-form');
  try {
    form.innerHTML = '<div class="text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Loading vehicle catalog…</div>';
    const years = await catalogYears();
    form.innerHTML = `<div class="row g-3"><div class="col-md-4"><label class="form-label fw-semibold" for="year">Year</label><select class="form-select" id="year"><option value="">Select</option>${years.map(x => `<option>${escapeHtml(x)}</option>`).join('')}</select></div><div class="col-md-4"><label class="form-label fw-semibold" for="make">Make</label><select class="form-select" id="make" disabled><option value="">Select</option></select></div><div class="col-md-4"><label class="form-label fw-semibold" for="model">Model</label><select class="form-select" id="model" disabled><option value="">Select</option></select></div></div><button class="btn btn-primary w-100 mt-4" id="continue" disabled>Continue to VIN lookup →</button><div id="catalog-error"></div>`;
    const year = form.querySelector('#year'), make = form.querySelector('#make'), model = form.querySelector('#model'), next = form.querySelector('#continue');
    year.onchange = async () => { make.innerHTML = '<option value="">Loading…</option>'; make.disabled = true; model.disabled = true; next.disabled = true; try { const makes = await catalogMakes(year.value); make.innerHTML = '<option value="">Select</option>' + makes.map(x => `<option>${escapeHtml(x)}</option>`).join(''); make.disabled = !year.value; } catch (error) { handleFailure(error, () => renderLookup(), '#catalog-error'); } };
    make.onchange = async () => { model.innerHTML = '<option value="">Loading…</option>'; model.disabled = true; next.disabled = true; try { const models = await catalogModels(year.value, make.value); model.innerHTML = '<option value="">Select</option>' + models.map(x => `<option>${escapeHtml(x)}</option>`).join(''); model.disabled = !make.value; } catch (error) { handleFailure(error, () => renderLookup(), '#catalog-error'); } };
    model.onchange = () => { next.disabled = !model.value; };
    next.onclick = () => { state.vehiclePathComplete = true; state.ymm = { year: year.value, make: make.value, model: model.value }; renderVin(state.ymm); };
  } catch (error) { handleFailure(error, () => renderYmm()); }
}

function renderVin(ymm) {
  const form = document.querySelector('#lookup-form');
  form.innerHTML = `${ymm ? `<div class="alert alert-success py-2 small">✓ MyGrant vehicle selected: <strong>${escapeHtml(ymm.year)} ${escapeHtml(ymm.make)} ${escapeHtml(ymm.model)}</strong></div>` : ''}<div id="vin-error"></div><label class="form-label fw-semibold" for="vin">Vehicle Identification Number (VIN)</label><input class="form-control vin-input" id="vin" maxlength="17" autocomplete="off" placeholder="Enter 17-character VIN" value="1C4HJXDG5MW625672"><div class="d-flex justify-content-between mt-2"><small class="text-secondary">Found on the dashboard or driver-side door jamb.</small><small id="count" class="text-secondary">17 / 17</small></div><button class="btn btn-primary w-100 mt-4" id="search">Search compatible ${state.glassType}</button>`;
  const vin = form.querySelector('#vin'), count = form.querySelector('#count');
  vin.oninput = () => { vin.value = vin.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''); count.textContent = `${vin.value.length} / 17`; };
  form.querySelector('#search').onclick = () => lookup(vin.value);
}

async function lookup(vin) {
  if (vin.length !== 17) { showInlineError('Please enter a valid 17-character VIN.', '#vin-error'); return; }
  setSteps('vehicle'); content.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary mb-3" role="status"></div><h2 class="h5">Searching ${isOperational ? 'secure API' : 'public mock data'}…</h2><p class="text-secondary">Identifying vehicle and retrieving compatible glass.</p><div class="loading-track mx-auto" style="max-width:360px"><div class="loading-bar"></div></div></div>`;
  const request = { vin, glassType: state.glassType, ...(state.glassType === 'Door Glass' ? state.ymm : {}) };
  try {
    let result;
    if (isOperational) result = await api.lookupByVin(request);
    else {
      const data = await getStaticData(); await new Promise(resolve => setTimeout(resolve, 600));
      const vehicle = data.vehicles.find(candidate => candidate.vin === vin);
      if (!vehicle) throw new Error('No vehicle was found for that VIN.');
      result = { vin: vehicle.vin, vehicle: { year: vehicle.year, make: vehicle.make, model: vehicle.model }, glassType: state.glassType, parts: vehicle.parts[state.glassType] || [], provider: 'public-mock' };
    }
    renderResults(result);
  } catch (error) { handleFailure(error, () => lookup(vin)); }
}

function renderResults(result) {
  setSteps('parts'); const { vehicle, parts } = result;
  content.innerHTML = `<div class="result-card p-4 mb-4"><div class="d-flex gap-3 align-items-start"><div class="fs-3 text-success">✓</div><div><div class="eyebrow text-success mb-1">VEHICLE IDENTIFIED</div><h2 class="h4 mb-1">${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</h2><span class="text-secondary small">VIN ${escapeHtml(result.vin)}</span></div></div></div><div class="d-flex justify-content-between align-items-center mb-3"><div><div class="eyebrow mb-1">COMPATIBLE RESULTS</div><h3 class="h5 mb-0">${escapeHtml(result.glassType)} parts</h3></div><span class="badge text-bg-light">${parts.length} found</span></div><div class="d-grid gap-3">${parts.map((part, index) => `<div class="part-row p-3 d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center"><div><div class="part-number">${escapeHtml(part.partNumber)}</div><div>${escapeHtml(part.description)}</div><small class="text-secondary">${part.features.map(escapeHtml).join(' · ')}</small></div><button class="btn ${index ? 'btn-outline-primary' : 'btn-primary'} px-4 select-part">Select part</button></div>`).join('')}</div><button class="btn btn-link text-decoration-none px-0 mt-4" id="new-search">← Start another lookup</button>`;
  document.querySelector('#new-search').onclick = renderGlass;
  document.querySelectorAll('.select-part').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.select-part').forEach(x => { x.className = 'btn btn-outline-primary px-4 select-part'; x.textContent = 'Select part'; }); btn.className = 'btn btn-success px-4 select-part'; btn.textContent = '✓ Selected'; setSteps('quote'); }; });
}

function handleFailure(error, retry, selector) {
  lastRetry = retry;
  if (isOperational && (error instanceof RRApi.SessionExpiredError || error.code === 'session_expired')) { renderConnection({ message: error.message, tone: 'warning', retryLabel: 'Reconnect and continue' }); return; }
  const message = error.message || 'The service could not complete the request.';
  if (selector && document.querySelector(selector)) {
    document.querySelector(selector).innerHTML = `<div class="alert alert-danger mt-3" role="alert">${escapeHtml(message)} <button class="btn btn-sm btn-outline-danger ms-2" id="inline-retry">Retry</button></div>`;
    document.querySelector('#inline-retry').onclick = retry; return;
  }
  content.innerHTML = `<div class="text-center py-4"><div class="fs-2 mb-3">⚠️</div><h2 class="h5">Lookup could not be completed</h2><p class="text-secondary">${escapeHtml(message)}</p><button class="btn btn-primary" id="retry-request">Retry request</button><button class="btn btn-link text-decoration-none" id="restart-request">Start over</button></div>`;
  document.querySelector('#retry-request').onclick = () => lastRetry(); document.querySelector('#restart-request').onclick = renderGlass;
}

function showInlineError(message, selector) { const target = document.querySelector(selector); if (target) target.innerHTML = `<div class="alert alert-danger" role="alert">${escapeHtml(message)}</div>`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

async function start() {
  updateEnvironmentLabel();
  if (!isOperational) { renderGlass(); return; }
  try {
    const callback = await oauth.handleCallback(); if (callback) restoreWorkflow(callback.workflow);
    updateEnvironmentLabel();
    if (!oauth.isAuthenticated()) { renderConnection(); return; }
    if (state.glassType) await renderLookup(); else renderGlass();
  } catch (error) { renderConnection({ message: error.message, tone: 'danger', retryLabel: 'Try secure connection again' }); }
}

start();
