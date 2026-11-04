// Marcador en vivo de la porra · Neza Studios
// /vivo            -> pantalla con engranaje para controlar el marcador
// /vivo?display=1  -> solo pantalla (sin controles), para la tele
// /vivo?corner=tr|tl|br|bl  -> esquina   ·   /vivo?big=1  -> grande centrado   ·   /vivo?bg=transp -> fondo transparente
const $ = s => document.querySelector(s);
const P = new URLSearchParams(location.search);
const DISPLAY = P.get('display') === '1';
const corner = ['tr', 'tl', 'br', 'bl'].includes(P.get('corner')) ? P.get('corner') : 'tr';

let KEY = sessionStorage.getItem('nezaKey') || '';
let M = { es: '', uy: '', min: '' };   // marcador en edición (modo control)
let lastEdit = 0;                       // para no pisar lo que estás tocando con el del servidor
let saveTimer = null;

function esc(s){ return String(s == null ? '' : s).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }
function n(v){ return (v === '' || v == null) ? '' : Number(v); }

function setupCard(){
  const card = $('#card');
  card.classList.add(P.get('big') === '1' ? 'big' : corner);
  if (P.get('bg') === 'transp') document.body.classList.add('transparent');
  if (DISPLAY) $('#gear').classList.add('hidden');
}

async function poll(){
  try{
    const r = await fetch('/api/vivo', { cache: 'no-store' });
    const d = await r.json();
    if (!d || !d.ok) return;
    // Sincroniza el marcador local con el del servidor salvo que estés editando ahora mismo
    if (DISPLAY || Date.now() - lastEdit > 4000){
      M = { es: d.marcador.es, uy: d.marcador.uy, min: d.marcador.min };
      reflectControls();
    }
    render(d);
  }catch(e){ /* reintenta en el siguiente ciclo */ }
}

function render(d){
  const m = d.marcador, lead = d.leader;
  const w = $('#winner');
  if (lead){
    w.classList.remove('empty');
    w.innerHTML = '<div class="tro">🏆</div><div class="who"><div class="ig">' + esc(lead.ig) + '</div>' +
      (lead.nombre ? '<div class="nm">' + esc(lead.nombre) + '</div>' : '') + '</div>';
  } else {
    w.classList.add('empty');
    const txt = (m.es === '' || m.es == null)
      ? 'Pon el marcador para ver quién gana'
      : 'Nadie acierta el ' + m.es + '–' + m.uy + ' todavía';
    w.innerHTML = '<div class="tro">🏆</div><div class="who"><div class="ig">' + esc(txt) + '</div></div>';
  }

  $('#esN').textContent = (m.es === '' || m.es == null) ? '–' : m.es;
  $('#uyN').textContent = (m.uy === '' || m.uy == null) ? '–' : m.uy;
  $('#min').innerHTML = (m.min === '' || m.min == null) ? 'Min. 1er gol: <b>—</b>' : "1er gol min. <b>" + esc(m.min) + "'</b>";

  const ul = $('#rank'); ul.innerHTML = '';
  (d.ranking || []).slice(0, 5).forEach((x, i) => {
    const li = document.createElement('li');
    if (i === 0) li.className = 'lead';
    const dif = x.dif == null ? '' : " · " + x.dif + "' cerca";
    li.innerHTML = '<span class="pos">' + (i + 1) + '</span><span class="rig">' + esc(x.ig) + '</span>' +
      '<span class="rsc">' + esc(x.es) + '-' + esc(x.uy) + (x.min ? " · " + esc(x.min) + "'" : '') + esc(dif) + '</span>';
    ul.appendChild(li);
  });
  $('#foot').innerHTML = '<span>' + d.total + ' participantes · ' + d.aciertos + ' aciertan</span><span>actualiza solo</span>';
}

// ---------- Controles ----------
function reflectControls(){
  $('#cEs').textContent = (M.es === '' || M.es == null) ? 0 : M.es;
  $('#cUy').textContent = (M.uy === '' || M.uy == null) ? 0 : M.uy;
  const mi = $('#cMin'); if (document.activeElement !== mi) mi.value = (M.min === '' || M.min == null) ? '' : M.min;
}
function bump(team, delta){
  const cur = Number(M[team] === '' || M[team] == null ? 0 : M[team]);
  M[team] = Math.max(0, cur + delta);
  lastEdit = Date.now(); reflectControls(); scheduleSave();
}
function scheduleSave(){
  $('#savehint').textContent = 'Guardando…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}
async function save(){
  if (!KEY){ openPwd(); return; }
  try{
    const r = await fetch('/api/vivo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: KEY, es: M.es === '' ? '' : Number(M.es), uy: M.uy === '' ? '' : Number(M.uy), min: M.min === '' ? '' : Number(M.min) })
    });
    const d = await r.json();
    if (r.status === 401 || (d && d.error === 'auth')){ sessionStorage.removeItem('nezaKey'); KEY = ''; openPwd(); return; }
    if (d && d.ok){ $('#savehint').textContent = 'Guardado ✓'; poll(); setTimeout(() => { $('#savehint').textContent = ''; }, 1500); }
  }catch(e){ $('#savehint').textContent = 'Error al guardar'; }
}
function openCtrl(){ reflectControls(); $('#ctrl').classList.remove('hidden'); }
function closeCtrl(){ $('#ctrl').classList.add('hidden'); }
function openPwd(){ $('#pwdWrap').classList.remove('hidden'); $('#pwd').focus(); }

function wire(){
  $('#gear').addEventListener('click', openCtrl);
  $('#close').addEventListener('click', closeCtrl);
  document.querySelectorAll('[data-bump]').forEach(b => b.addEventListener('click', () => {
    const [team, d] = b.dataset.bump.split(':'); bump(team, Number(d));
  }));
  $('#cMin').addEventListener('input', () => { M.min = $('#cMin').value === '' ? '' : Number($('#cMin').value); lastEdit = Date.now(); scheduleSave(); });
  $('#reset').addEventListener('click', () => { M = { es: 0, uy: 0, min: '' }; lastEdit = Date.now(); reflectControls(); scheduleSave(); });
  $('#savePwd').addEventListener('click', () => {
    const v = $('#pwd').value.trim(); if (!v) return;
    KEY = v; sessionStorage.setItem('nezaKey', v); $('#pwdWrap').classList.add('hidden'); $('#pwd').value=''; save();
  });
  $('#pwd').addEventListener('keydown', e => { if (e.key === 'Enter') $('#savePwd').click(); });
}

setupCard(); wire(); poll(); setInterval(poll, 4000);
