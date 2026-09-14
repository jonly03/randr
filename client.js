const root = document.querySelector('#root');
const state = { glassType:null, vehiclePathComplete:false, data:null };

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar py-3">
      <div class="container workflow d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3"><div class="brand-mark">R&amp;R</div><div><div class="brand-name">Finest Auto Glass</div><div class="brand-sub">Service Intake</div></div></div>
        <div class="d-flex align-items-center gap-3"><span class="badge rounded-pill demo-pill px-3 py-2">● Demo environment</span><a class="small text-decoration-none d-none d-sm-inline" href="blueprint.html">View Blueprint</a></div>
      </div>
    </header>
    <main class="container workflow py-4 py-md-5">
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-end mb-3"><div><div class="eyebrow mb-1">NEW SERVICE REQUEST</div><h1 class="h3 mb-0">Identify the correct glass</h1></div><span class="text-secondary small d-none d-md-inline">Request #RR-1048</span></div>
        <div class="stepper" aria-label="Request progress">
          <div class="step active" data-step="glass"><span>1</span>Glass type</div><div class="step" data-step="vehicle"><span>2</span>Vehicle</div><div class="step" data-step="parts"><span>3</span>Parts</div><div class="step" data-step="quote"><span>4</span>Quote</div>
        </div>
      </div>
      <section class="card main-card"><div class="card-accent"></div><div class="card-body p-4 p-md-5">
        <div id="content"></div>
      </div></section>
      <p class="text-center text-secondary small mt-4">Prototype data only · No customer information is stored</p>
    </main>
  </div>`;

const content = document.querySelector('#content');
const setSteps = current => {
  const order=['glass','vehicle','parts','quote']; const at=order.indexOf(current);
  document.querySelectorAll('.step').forEach((el,i)=>{ el.className=`step ${i<at?'complete':i===at?'active':''}`; el.querySelector('span').textContent=i<at?'✓':i+1; });
};

async function getData(){ if(state.data) return state.data; const response=await fetch('mock-server/lookup-data.json'); if(!response.ok) throw new Error('Mock service unavailable'); state.data=await response.json(); return state.data; }

function renderGlass(){
  setSteps('glass');
  content.innerHTML=`<div class="text-center mb-4"><div class="eyebrow mb-2">STEP 1 OF 4</div><h2 class="h4">What type of glass needs service?</h2><p class="text-secondary mb-0">Choose one option to begin the vehicle lookup.</p></div>
  <div class="row g-3 justify-content-center">${[['Windshield','▱','Front vehicle glass'],['Back Glass','▰','Rear vehicle glass'],['Door Glass','▯','Side door glass']].map(([name,icon,desc])=>`<div class="col-md-4"><button class="glass-option w-100" data-glass="${name}"><span class="glass-icon">${icon}</span><strong class="d-block">${name}</strong><small class="text-secondary">${desc}</small></button></div>`).join('')}</div>`;
  document.querySelectorAll('[data-glass]').forEach(btn=>btn.addEventListener('click',()=>{ state.glassType=btn.dataset.glass; state.vehiclePathComplete=false; renderLookup(); }));
}

async function renderLookup(){
  setSteps('vehicle');
  const door=state.glassType==='Door Glass';
  content.innerHTML=`<button class="btn btn-link px-0 text-decoration-none small mb-3" id="back">← Change glass type</button><div class="row g-4"><div class="col-lg-7"><div class="eyebrow mb-2">${door?'DOOR GLASS LOOKUP':'VIN LOOKUP'}</div><h2 class="h4 mb-2">${door?'First, identify the vehicle':'Enter the vehicle VIN'}</h2><p class="text-secondary">${door?'MyGrant requires Year, Make, and Model before the VIN search for door glass.':'We’ll use the VIN to identify the vehicle and retrieve compatible glass.'}</p><div id="lookup-form"></div></div><div class="col-lg-5"><div class="helper-panel p-4"><strong class="d-block mb-2">Selected service</strong><div class="h5 mb-2">${state.glassType}</div><small class="text-secondary">${door?'Lookup path: Year → Make → Model → VIN':'Lookup path: VIN → compatible parts'}</small></div></div></div>`;
  document.querySelector('#back').onclick=renderGlass;
  if(door) await renderYmm(); else renderVin();
}

async function renderYmm(){
  try{
    const data=await getData(), form=document.querySelector('#lookup-form');
    form.innerHTML=`<div class="row g-3"><div class="col-md-4"><label class="form-label fw-semibold" for="year">Year</label><select class="form-select" id="year"><option value="">Select</option>${data.catalog.years.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="col-md-4"><label class="form-label fw-semibold" for="make">Make</label><select class="form-select" id="make" disabled><option value="">Select</option></select></div><div class="col-md-4"><label class="form-label fw-semibold" for="model">Model</label><select class="form-select" id="model" disabled><option value="">Select</option></select></div></div><button class="btn btn-primary w-100 mt-4" id="continue" disabled>Continue to VIN lookup →</button>`;
    const year=form.querySelector('#year'), make=form.querySelector('#make'), model=form.querySelector('#model'), next=form.querySelector('#continue');
    year.onchange=()=>{ make.innerHTML='<option value="">Select</option>'+((data.catalog.makes[year.value]||[]).map(x=>`<option>${x}</option>`).join('')); make.disabled=!year.value; model.disabled=true; next.disabled=true; };
    make.onchange=()=>{ model.innerHTML='<option value="">Select</option>'+((data.catalog.models[`${year.value}|${make.value}`]||[]).map(x=>`<option>${x}</option>`).join('')); model.disabled=!make.value; next.disabled=true; };
    model.onchange=()=>next.disabled=!model.value;
    next.onclick=()=>{ state.vehiclePathComplete=true; renderVin({year:year.value,make:make.value,model:model.value}); };
  }catch(e){ showError(e.message); }
}

function renderVin(ymm){
  const form=document.querySelector('#lookup-form');
  form.innerHTML=`${ymm?`<div class="alert alert-success py-2 small">✓ MyGrant vehicle selected: <strong>${ymm.year} ${ymm.make} ${ymm.model}</strong></div>`:''}<label class="form-label fw-semibold" for="vin">Vehicle Identification Number (VIN)</label><input class="form-control vin-input" id="vin" maxlength="17" autocomplete="off" placeholder="Enter 17-character VIN" value="1C4HJXDG5MW625672"><div class="d-flex justify-content-between mt-2"><small class="text-secondary">Found on the dashboard or driver-side door jamb.</small><small id="count" class="text-secondary">17 / 17</small></div><button class="btn btn-primary w-100 mt-4" id="search">Search compatible ${state.glassType}</button>`;
  const vin=form.querySelector('#vin'), count=form.querySelector('#count');
  vin.oninput=()=>{ vin.value=vin.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,''); count.textContent=`${vin.value.length} / 17`; };
  form.querySelector('#search').onclick=()=>lookup(vin.value);
}

async function lookup(vin){
  if(vin.length!==17){ showError('Please enter a valid 17-character VIN.'); return; }
  setSteps('vehicle'); content.innerHTML=`<div class="text-center py-5"><div class="spinner-border text-primary mb-3" role="status"></div><h2 class="h5">Searching MyGrant…</h2><p class="text-secondary">Identifying vehicle and retrieving compatible glass.</p><div class="loading-track mx-auto" style="max-width:360px"><div class="loading-bar"></div></div></div>`;
  try{ const data=await getData(); await new Promise(r=>setTimeout(r,850)); const vehicle=data.vehicles.find(v=>v.vin===vin)||data.vehicles[0]; renderResults(vehicle); }catch(e){ showError(e.message); }
}

function renderResults(vehicle){
  setSteps('parts'); const parts=vehicle.parts[state.glassType]||[];
  content.innerHTML=`<div class="result-card p-4 mb-4"><div class="d-flex gap-3 align-items-start"><div class="fs-3 text-success">✓</div><div><div class="eyebrow text-success mb-1">VEHICLE IDENTIFIED</div><h2 class="h4 mb-1">${vehicle.year} ${vehicle.make} ${vehicle.model}</h2><span class="text-secondary small">VIN ${vehicle.vin}</span></div></div></div><div class="d-flex justify-content-between align-items-center mb-3"><div><div class="eyebrow mb-1">COMPATIBLE RESULTS</div><h3 class="h5 mb-0">${state.glassType} parts</h3></div><span class="badge text-bg-light">${parts.length} found</span></div><div class="d-grid gap-3">${parts.map((p,i)=>`<div class="part-row p-3 d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center"><div><div class="part-number">${p.partNumber}</div><div>${p.description}</div><small class="text-secondary">${p.features.join(' · ')}</small></div><button class="btn ${i?'btn-outline-primary':'btn-primary'} px-4 select-part" data-part="${p.partNumber}">Select part</button></div>`).join('')}</div><button class="btn btn-link text-decoration-none px-0 mt-4" id="new-search">← Start another lookup</button>`;
  document.querySelector('#new-search').onclick=renderGlass;
  document.querySelectorAll('.select-part').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.select-part').forEach(x=>{x.className='btn btn-outline-primary px-4 select-part';x.textContent='Select part'}); btn.className='btn btn-success px-4 select-part';btn.textContent='✓ Selected'; setSteps('quote'); });
}

function showError(message){ const target=document.querySelector('#lookup-form')||content; target.insertAdjacentHTML('afterbegin',`<div class="alert alert-danger" role="alert">${message}</div>`); }
renderGlass();
