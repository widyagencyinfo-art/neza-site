// Animación de anuncio del ganador de la porra · Neza Studios
// Coge el ganador del marcador final (líder de /api/vivo) o se escribe a mano (⚙ o ?ig=@x&nombre=Y).
const $ = s => document.querySelector(s);
const P = new URLSearchParams(location.search);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

let W = { ig: '', nombre: '', es: null, uy: null, min: null }; // ganador actual

function setState(s) { document.body.dataset.state = s; }

async function loadWinner() {
  // 1) query string tiene prioridad
  if (P.get('ig')) {
    W.ig = P.get('ig'); W.nombre = P.get('nombre') || '';
  } else {
    // 2) líder del marcador en vivo
    try {
      const d = await (await fetch('/api/vivo', { cache: 'no-store' })).json();
      if (d && d.ok && d.leader) W = { ig: d.leader.ig, nombre: d.leader.nombre || '', es: d.leader.es, uy: d.leader.uy, min: d.leader.min };
    } catch (e) { /* sin datos: se mete a mano */ }
  }
  reflectPre();
}

function reflectPre() {
  const who = $('#preWho');
  if (W.ig) { who.textContent = W.ig; who.classList.remove('hidden'); $('#preSub').classList.remove('hidden'); }
  else { who.classList.add('hidden'); $('#preSub').classList.add('hidden'); }
  $('#mIg').value = W.ig || '';
  $('#mNombre').value = W.nombre || '';
}

function populate() {
  if (!W.ig) return;
  let ig = W.ig.trim(); if (ig[0] !== '@') ig = '@' + ig;
  $('#igText').textContent = ig;
  $('#wName').textContent = W.nombre || '';
  $('#wName').style.display = W.nombre ? '' : 'none';
  const meta = (W.es != null && W.uy != null) ? ('acertó el ' + W.es + '–' + W.uy + (W.min ? " · min " + W.min + "'" : '')) : '';
  $('#wMeta').textContent = meta;
  $('#wMeta').style.display = meta ? '' : 'none';
}

function goFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  } catch (e) { /* el navegador puede bloquearlo; no pasa nada */ }
}

async function reveal() {
  if (!W.ig) { openManual(); return; }
  goFullscreen(); // oculta pestañas/barra de Chrome al revelar
  // redoble 3 · 2 · 1
  setState('count');
  const cn = $('#countNum');
  for (const n of [3, 2, 1]) {
    cn.textContent = n; cn.style.animation = 'none'; void cn.offsetWidth; cn.style.animation = 'pop .6s';
    await wait(760);
  }
  // ¡ganador!
  populate();
  setState('reveal');
  fire();
}

// ---------- confeti ----------
const COLORS = ['#0070E0', '#FFCB45', '#FFFFFF', '#33A1FF', '#FFE08A'];
const cv = $('#confetti'), ctx = cv.getContext('2d');
let parts = [], raf = null;
function resize() { cv.width = innerWidth; cv.height = innerHeight; }
function burst(n, ox) {
  const cx = ox == null ? innerWidth / 2 : ox;
  for (let i = 0; i < n; i++) parts.push({
    x: cx + (Math.random() - .5) * 160, y: innerHeight * 0.42,
    vx: (Math.random() - .5) * 16, vy: Math.random() * -17 - 6, g: .32 + Math.random() * .22,
    w: 6 + Math.random() * 8, h: 9 + Math.random() * 12, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .45,
    color: COLORS[Math.random() * COLORS.length | 0], life: 1, fade: .004 + Math.random() * .004
  });
  if (!raf) loop();
}
function loop() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (const p of parts) {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr;
    if (p.y > innerHeight * 0.5) p.life -= p.fade;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  if (parts.length) raf = requestAnimationFrame(loop);
  else { raf = null; ctx.clearRect(0, 0, cv.width, cv.height); }
}
function fire() {
  burst(160, innerWidth / 2);
  setTimeout(() => { burst(110, innerWidth * .25); burst(110, innerWidth * .75); }, 220);
  setTimeout(() => burst(120, innerWidth / 2), 600);
}

// ---------- manual ----------
function openManual() { $('#manual').classList.add('open'); $('#mIg').focus(); }
function closeManual() { $('#manual').classList.remove('open'); }

// ---------- wiring ----------
function wire() {
  $('#revealBtn').addEventListener('click', reveal);
  $('#replayBtn').addEventListener('click', () => { setState('pre'); });
  $('#gear').addEventListener('click', openManual);
  $('#mCancel').addEventListener('click', closeManual);
  $('#mUse').addEventListener('click', () => {
    const ig = $('#mIg').value.trim(); if (!ig) return;
    W = { ig, nombre: $('#mNombre').value.trim(), es: null, uy: null, min: null };
    reflectPre(); closeManual(); reveal();
  });
  $('#mIg').addEventListener('keydown', e => { if (e.key === 'Enter') $('#mUse').click(); });
  addEventListener('resize', resize);
}

resize(); wire(); setState('pre'); loadWinner();
