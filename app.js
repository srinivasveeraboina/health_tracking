// Simple localStorage-based data model + alarm scheduling (best-effort web approach)
const LS_KEYS = {MEDS:'ht_meds', FEVERS:'ht_fevers', VITALS:'ht_vitals', INTAKES:'ht_intakes'}; // VITALS stores temperature/bp/pulse entries
let alarmTimeouts = {}; // in-memory timers; won't persist across closes

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

// ---- UI: navigation helpers for multipage app
function highlightActiveNav(){
  const page = (location.pathname.split('/').pop() || 'dashboard.html');
  document.querySelectorAll('.bottom-nav a').forEach(a=>a.classList.remove('active'));
  const el = document.querySelector(`.bottom-nav a[href="${page}"]`);
  if(el) el.classList.add('active');
}

// page-specific quick actions (only attach when present)
if($('#dash-add-med')) $('#dash-add-med').addEventListener('click', ()=>{ location.href='medicines.html'; });
if($('#dash-log-fever')) $('#dash-log-fever').addEventListener('click', ()=>{ location.href='vitals.html'; });
if($('#quick-add-medicine')) $('#quick-add-medicine').addEventListener('click', ()=>{ location.href='medicines.html'; });
if($('#quick-log-fever')) $('#quick-log-fever').addEventListener('click', ()=>{ location.href='vitals.html'; });

// ---- Storage helpers
function load(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []}}
function save(key,val){localStorage.setItem(key,JSON.stringify(val))}

// ---- Medicines
function computeNextTimeDisplay(m){
  const now = new Date(); const end = new Date(m.end+'T23:59:59'); if(now> end) return 'Completed';
  // find next occurrence among times
  let next = null;
  for(let i=0;i<7;i++){
    const d = new Date(); d.setDate(d.getDate()+i);
    if(d < new Date(m.start+'T00:00:00')) continue;
    for(const t of m.times){ const [hh,mm] = t.split(':').map(Number); const occ = new Date(d); occ.setHours(hh,mm,0,0); if(occ>now){ if(!next || occ<next) next=occ; } }
    if(next) break;
  }
  return next? next.toLocaleString() : '—';
}

function renderMeds(){
  const list = $('#med-list'); if(!list) return;
  const meds = load(LS_KEYS.MEDS);
  list.innerHTML='';
  meds.forEach(m=>{
    const nextTime = computeNextTimeDisplay(m);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="status-dot ${m.enabled? 'enabled':'disabled'}" aria-hidden="true"></div>
      <div class="med-main">
        <div class="med-title"><strong>${m.name}</strong> <span class="muted">${m.dosage}</span></div>
        <div class="med-next">Next: <span class="next-status">${nextTime}</span></div>
        <div class="med-dates">From ${m.start} — ${m.end} ${m.notes? '• '+m.notes : ''}</div>
        <div class="med-actions">
          <button class="btn btn-ghost disable" data-id="${m.id}">${m.enabled? 'Disable':'Enable'}</button>
          <button class="btn btn-outline mark-taken" data-id="${m.id}">Mark taken</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
  // vitals page med checkboxes (backwards compatible with older id)
  const feverMeds = $('#vitals-meds') || $('#fever-meds'); if(feverMeds){ feverMeds.innerHTML=''; meds.forEach(m => feverMeds.insertAdjacentHTML('beforeend', `<label><input type="checkbox" data-id="${m.id}">${m.name}</label>`)); }
}

function checkCourseCompletion(){
  const meds = load(LS_KEYS.MEDS); const today = new Date(); let changed=false;
  meds.forEach(m=>{ const end = new Date(m.end+'T23:59:59'); if(today > end && m.enabled){ m.enabled=false; changed=true; }});
  if(changed){ save(LS_KEYS.MEDS, meds); renderMeds(); }
}

function addMedicine(m){
  const meds = load(LS_KEYS.MEDS);
  meds.push(m); save(LS_KEYS.MEDS, meds); renderMeds(); scheduleAlarmsForMedicine(m);
  // update dashboard (if present) so newly added medicines show up immediately
  try{ renderDashboard(); }catch(e){}
}

function buildMedFromForm(){
  const times = $all('.med-time').map(i=>i.value).filter(Boolean);
  if(times.length===0) return null;
  const start = $('#med-start').value || new Date().toISOString().slice(0,10);
  const duration = parseInt($('#med-duration').value||'7');
  const startDate = new Date(start);
  const endDate = new Date(startDate); endDate.setDate(startDate.getDate()+duration-1);
  return {id:'m_'+Date.now(), name:$('#med-name').value, dosage:$('#med-dosage').value, times, frequency:$('#med-frequency').value, duration, start:startDate.toISOString().slice(0,10), end:endDate.toISOString().slice(0,10), notes:$('#med-notes')?$('#med-notes').value:'', vibrate:$('#med-vibrate').checked, loud:$('#med-loop').checked, enabled:true};
}

const addTimeBtn = $('#add-time'); if(addTimeBtn) addTimeBtn.addEventListener('click', ()=>{
  const wrapper = document.createElement('div'); wrapper.className='time-chip';
  const inp = document.createElement('input'); inp.type='time'; inp.className='med-time'; inp.required=true;
  const rem = document.createElement('button'); rem.type='button'; rem.className='remove-time btn btn-ghost btn-sm'; rem.textContent='×';
  rem.addEventListener('click', ()=>{ wrapper.remove(); });
  wrapper.appendChild(inp); wrapper.appendChild(rem); $('#times-list').appendChild(wrapper); inp.focus();
});

// delegate remove buttons in case times are rendered dynamically
const timesList = $('#times-list'); if(timesList) timesList.addEventListener('click', e=>{ if(e.target.classList && e.target.classList.contains('remove-time')){ const w = e.target.closest('.time-chip'); if(w) w.remove(); }});

const medForm = $('#medicine-form'); if(medForm) medForm.addEventListener('submit', e=>{
  e.preventDefault();
  const m = buildMedFromForm(); if(!m) return alert('Add at least one time');
  addMedicine(m);
  e.target.reset();
  // reset times area to a single chip
  $('#times-list').innerHTML = '<div class="time-chip"><input type="time" class="med-time" required /><button type="button" class="remove-time btn btn-ghost btn-sm">×</button></div>';
});

const saveAddBtn = $('#save-add-another'); if(saveAddBtn) saveAddBtn.addEventListener('click', ()=>{
  const m = buildMedFromForm(); if(!m) return alert('Add at least one time');
  addMedicine(m);
  // keep times & start for quick multi-entry, clear name/dosage/notes
  if($('#med-name')) $('#med-name').value='';
  if($('#med-dosage')) $('#med-dosage').value='';
  if($('#med-notes')) $('#med-notes').value='';
  if($('#med-name')) $('#med-name').focus();
  alert('Saved — add another');
});

const medListEl = $('#med-list'); if(medListEl) medListEl.addEventListener('click', e=>{
  if(e.target.classList.contains('disable')){
    const id = e.target.dataset.id; const meds = load(LS_KEYS.MEDS); const m = meds.find(x=>x.id===id); if(m){ m.enabled=!m.enabled; save(LS_KEYS.MEDS,meds); renderMeds(); }
  }
  if(e.target.classList.contains('mark-taken')){
    const id = e.target.dataset.id; const meds = load(LS_KEYS.MEDS); const m = meds.find(x=>x.id===id); if(m){ addIntake({id:'manual_'+Date.now(), medId:m.id, time:new Date().toISOString(), status:'taken'}); alert('Marked as taken'); renderHistory(); }
  }
});

// ---- Alarm scheduling (best-effort): schedules timers for upcoming times while the page runs
function whenIsNextOccurrence(timeStr){ // timeStr 'HH:MM'
  const [h,m] = timeStr.split(':').map(Number); const now = new Date(); const occ = new Date(now); occ.setHours(h, m, 0, 0); if(occ<=now) occ.setDate(occ.getDate()+1); return occ; }

function scheduleAlarmsForMedicine(m){
  if(!m.enabled) return;
  // compute next few occurrences up to course end
  const end = new Date(m.end+'T23:59:59');
  const now = new Date();
  const occurrences = [];
  let day = new Date();
  for(let i=0;i<Math.ceil((end-now)/ (24*60*60*1000))+1 && i<365;i++){
    const d = new Date(now); d.setDate(now.getDate()+i);
    if(d < new Date(m.start+'T00:00:00')) continue;
    if(d> end) break;
    for(const t of m.times){ const [hh,mm]=t.split(':'); const occ = new Date(d); occ.setHours(parseInt(hh),parseInt(mm),0,0); if(occ>now) occurrences.push(occ); }
  }
  occurrences.slice(0,20).forEach(occ => scheduleAlarm(m, occ));
}

function scheduleAlarm(m, datetime){
  const id = m.id + '_' + datetime.getTime();
  // clear if exists
  if(alarmTimeouts[id]) { clearTimeout(alarmTimeouts[id]); }
  const delay = datetime - new Date();
  if(delay<=0) return;
  alarmTimeouts[id] = setTimeout(()=>{ triggerAlarm(m, id); delete alarmTimeouts[id]; }, delay);
}

async function triggerAlarm(m, occurrenceId){
  // show notification via service worker
  if(Notification.permission!=='granted') await Notification.requestPermission();
  const reg = await navigator.serviceWorker.ready;
  const title = `Take ${m.name}`;
  const opts = {
    body: `${m.dosage} • ${m.notes||''}`,
    tag: occurrenceId,
    renotify: true,
    data: {medId:m.id, occurrence:occurrenceId},
    vibrate: m.vibrate ? [200,100,200] : undefined,
    actions: [ {action:'taken', title:'Mark taken'}, {action:'missed', title:'Missed'}, {action:'snooze', title:'Snooze 5 min'} ]
  };
  try { await reg.showNotification(title, opts); } catch(e){ console.warn('Notification error',e); }
  // also add to in-app intake history as 'reminder' (will be marked taken/missed on action)
  addIntake({id:occurrenceId, medId:m.id, time:new Date().toISOString(), status:'reminder'});
}

// ---- Intake history
function addIntake(entry){ const h = load(LS_KEYS.INTAKES); h.push(entry); save(LS_KEYS.INTAKES,h); renderHistory(); }

// handle messages from service worker for notification actions
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e=>{
  const d = e.data; if(!d) return;
  if(d.type==='notification-action'){ handleNotificationAction(d.action, d.data); }
});

function handleNotificationAction(action, data){
  if(!data || !data.medId) return;
  const medId = data.medId; const occ = data.occurrence;
  const snoozeMinutes = $('#setting-snooze').checked ? 5 : 0;
  if(action === 'taken'){
    // mark intake
    const h = load(LS_KEYS.INTAKES); const it = h.find(x=>x.id===occ); if(it) it.status='taken'; save(LS_KEYS.INTAKES,h); renderHistory(); alert('Marked taken'); }
  else if(action === 'missed'){
    const h = load(LS_KEYS.INTAKES); const it = h.find(x=>x.id===occ); if(it) it.status='missed'; save(LS_KEYS.INTAKES,h); renderHistory(); alert('Marked missed'); }
  else if(action === 'snooze'){
    const dt = new Date(Date.now() + snoozeMinutes*60*1000);
    const meds = load(LS_KEYS.MEDS); const m = meds.find(x=>x.id===medId); if(m) scheduleAlarm(m, dt); alert('Snoozed'); }
}

// ---- Vitals logging (temperature, blood pressure, pulse)
const vitalsForm = $('#vitals-form'); if(vitalsForm) vitalsForm.addEventListener('submit', e=>{
  e.preventDefault();
  const type = $('#vital-type').value; const notes = $('#vital-notes').value; const selectedMedIds = $all('#vitals-meds input:checked').map(cb=>cb.dataset.id);
  // assemble timestamp from separate date/time inputs (fallback to now)
  let time = new Date().toISOString();
  const vd = $('#vital-date') && $('#vital-date').value;
  const vt = $('#vital-clock') && $('#vital-clock').value;
  try{
    if(vd && vt){ time = new Date(vd + 'T' + vt).toISOString(); }
    else if(vd){ time = new Date(vd).toISOString(); }
    else if(vt){ const now = new Date(); const parts = vt.split(':').map(Number); now.setHours(parts[0]||0, parts[1]||0, 0, 0); time = now.toISOString(); }
  }catch(e){ /* leave time as now */ }
  let entry = {id:'v_'+Date.now(), type, time, notes, meds:selectedMedIds};
  if(type === 'temperature'){ entry.value = parseFloat($('#vital-temp').value); entry.unit = $('#vital-unit').value || 'C'; }
  else if(type === 'bp'){ entry.systolic = parseInt($('#vital-sys').value||0); entry.diastolic = parseInt($('#vital-dia').value||0); }
  else if(type === 'pulse'){ entry.value = parseInt($('#vital-pulse').value||0); }
  const vs = load(LS_KEYS.VITALS); vs.push(entry); save(LS_KEYS.VITALS, vs); renderVitals(); renderChart();
  e.target.reset(); // keep medicines selection state
});

function renderVitals(){ const vs = load(LS_KEYS.VITALS); const ul = $('#vitals-list'); if(!ul) return; ul.innerHTML=''; vs.slice().reverse().forEach(v=>{
    const li = document.createElement('li');
    if(v.type === 'temperature'){
      li.innerHTML = `<strong>${v.value}${v.unit||'C'}</strong> <div>${new Date(v.time).toLocaleString()}</div><div class="small muted">${v.notes||''}</div>`;
    } else if(v.type === 'bp'){
      li.innerHTML = `<strong>${v.systolic}/${v.diastolic} mmHg</strong> <div>${new Date(v.time).toLocaleString()}</div><div class="small muted">${v.notes||''}</div>`;
    } else if(v.type === 'pulse'){
      li.innerHTML = `<strong>${v.value} bpm</strong> <div>${new Date(v.time).toLocaleString()}</div><div class="small muted">${v.notes||''}</div>`;
    }
    ul.appendChild(li);
  });
}


// ---- History & chart
function renderHistory(){ const h = load(LS_KEYS.INTAKES); const ul = $('#intake-history'); if(!ul) return; ul.innerHTML=''; h.slice().reverse().forEach(i=>{ const m = load(LS_KEYS.MEDS).find(x=>x.id===i.medId); ul.innerHTML += `<li>${new Date(i.time).toLocaleString()} — ${m?m.name:'?'} — ${i.status||'reminder'}</li>`; }); }

let chart;
function renderChart(){ // draw temperature trend from VITALS (temperature entries)
  const vs = load(LS_KEYS.VITALS).filter(v=>v.type==='temperature'); const labels = vs.map(f=>new Date(f.time).toLocaleString()); const data = vs.map(f=>f.value);
  const canvas = document.getElementById('vitals-chart') || document.getElementById('fever-chart'); if(!canvas) return; const ctx = canvas.getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {type:'line', data:{labels, datasets:[{label:'Temp', data, borderColor:'#0b76ef', fill:false}]}, options:{}});
}

function renderDashboard(){
  const upcomingBody = $('#upcoming-body'); if(!upcomingBody) return; upcomingBody.innerHTML='';
  const meds = load(LS_KEYS.MEDS); const now = new Date(); const end = new Date(now); end.setDate(now.getDate()+1);
  const items = [];
  meds.forEach(m=>{
    if(!m.enabled) return;
    m.times.forEach(t=>{ const d = new Date(); const [hh,mm]=t.split(':').map(Number); d.setHours(hh,mm,0,0); if(d > now && d < end && new Date(m.start+'T00:00:00') <= d && d <= new Date(m.end+'T23:59:59')){ items.push({time:t,name:m.name,dosage:m.dosage}) } });
  });
  if(items.length===0){
    upcomingBody.innerHTML = `<div class="card-empty"><div class="empty-ico"><svg width="56" height="56" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#E6F0FF" stroke-width="1.5" fill="#F6FBFF"/><path d="M9.5 12.5l1.8 1.8L15 11.6" stroke="#60A5FA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="muted">No medicines scheduled for now.</div></div>`;
  } else {
    const ul = document.createElement('ul'); ul.className='list'; items.forEach(it=>{ const li = document.createElement('li'); li.innerHTML = `<div>${it.time} <strong>${it.name}</strong></div><div class="muted">${it.dosage}</div>`; ul.appendChild(li); }); upcomingBody.appendChild(ul);
  }
  const di = $('#dashboard-intakes'); if(di) di.textContent = load(LS_KEYS.INTAKES).filter(i=>{ const d = new Date(i.time); const today = new Date(); return d.toDateString() === today.toDateString(); }).length;
  const df = $('#dashboard-vitals'); if(df) df.textContent = load(LS_KEYS.VITALS).filter(f=>{ const d = new Date(f.time); const today = new Date(); return d.toDateString() === today.toDateString(); }).length;
} 

const exportBtn = $('#export-csv'); if(exportBtn) exportBtn.addEventListener('click', ()=>{
  // simple export of vitals and intakes
  let out = 'type,id,time,metric,values,meds,status,notes\n';
  load(LS_KEYS.VITALS).forEach(v=>{
    if(v.type==='temperature') out += `vital,${v.id},${v.time},temperature,${v.value}${v.unit?(' '+v.unit):''},${(v.meds||[]).join('|')},,${(v.notes||'')}\n`;
    else if(v.type==='bp') out += `vital,${v.id},${v.time},blood-pressure,${v.systolic}/${v.diastolic},${(v.meds||[]).join('|')},,${(v.notes||'')}\n`;
    else if(v.type==='pulse') out += `vital,${v.id},${v.time},pulse,${v.value},${(v.meds||[]).join('|')},,${(v.notes||'')}\n`;
  });
  load(LS_KEYS.INTAKES).forEach(i=>{ const m = load(LS_KEYS.MEDS).find(x=>x.id===i.medId); out += `intake,${i.id},${i.time},,${m?m.name:''},${i.status||''},\n`; });
  const blob = new Blob([out],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='health-export.csv'; a.click(); URL.revokeObjectURL(url);
});

const clearBtn = $('#clear-data'); if(clearBtn) clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all saved data?')){ localStorage.clear(); renderAll(); alert('Cleared'); }});

// ---- initialization
async function init(){
  if('serviceWorker' in navigator) try{ await navigator.serviceWorker.register('sw.js'); console.log('sw registered'); } catch(e){console.warn(e);} 
  if(Notification.permission !== 'granted') Notification.requestPermission();
  // migrate legacy "fever" entries to the newer VITALS key
  try{
    const legacy = load(LS_KEYS.FEVERS);
    if(legacy && legacy.length){ const vs = load(LS_KEYS.VITALS);
      legacy.forEach(f=>{ vs.push({id:'v_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), type:'temperature', time:f.time||f.t||new Date().toISOString(), value:f.value||f.temp||null, unit:f.unit||'C', notes:f.notes||'', meds:f.meds||[]}); });
      save(LS_KEYS.VITALS, vs); localStorage.removeItem(LS_KEYS.FEVERS); console.log('Migrated legacy fever entries to vitals');
    }
  }catch(e){console.warn('migration error',e)}
  renderAll();
  // schedule upcoming alarms for medicines
  load(LS_KEYS.MEDS).forEach(m=>scheduleAlarmsForMedicine(m));
  // check for completed courses now and daily
  checkCourseCompletion();
  setInterval(checkCourseCompletion, 24*60*60*1000);
  // highlight nav and render page-specific content
  highlightActiveNav();
  const page = document.body.dataset.page || (location.pathname.split('/').pop() || 'dashboard.html');
  if(page === 'dashboard.html' || page === 'dashboard') renderDashboard();
  if(page === 'medicines.html' || page === 'medicines') renderMeds();
  if(page === 'vitals.html' || page === 'vitals') renderVitals();
  if(page === 'history.html' || page === 'history'){ renderChart(); renderHistory(); }
  // attach header quick-adds safely
  if($('#quick-add-medicine')) $('#quick-add-medicine').addEventListener('click', ()=>{ location.href='medicines.html';});
  if($('#quick-log-fever')) $('#quick-log-fever').addEventListener('click', ()=>{ location.href='vitals.html';});

  // sync across tabs: when localStorage changes in another tab, re-render relevant sections
  window.addEventListener('storage', (e)=>{ if(e.key && e.key.indexOf('ht_')===0) renderAll(); });

  // Save bar is inline (no JS needed to reposition it on mobile).
}

function renderAll(){ renderMeds(); if(typeof renderVitals === 'function') renderVitals(); renderHistory(); renderChart(); }

init();