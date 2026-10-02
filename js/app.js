// Orquestación: lienzo, cámara, capítulos, transiciones, controles y exportación.
import { clamp, lerp, lerpRect, E } from './core.js';
import { makePaper, makeTooth, INK, LABEL_FONT, NOTE_FONT, MONO_FONT } from './pencil.js';
import { Frame } from './render.js';
import { PHASES } from './scene.js';
import { MapScene } from './scenes/map.js';
import { PowerScene } from './scenes/power.js';
import { JourneyScene } from './scenes/journey.js';
import { FoodScene } from './scenes/food.js';
import { DoorScene } from './scenes/door.js';
import { FinalScene } from './scenes/final.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const ctx = canvas.getContext('2d');
const layer = document.createElement('canvas');
const lg = layer.getContext('2d');
const snap = document.createElement('canvas');
const sg = snap.getContext('2d');

const chapters = [new MapScene(), new PowerScene(), new JourneyScene(), new FoodScene(), new DoorScene()];
const scenes = [...chapters, new FinalScene(chapters)];
const SLUGS = ['mapa', 'energia', 'viaje', 'alimento', 'puerta', 'final'];

const mqReduced = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = mqReduced.matches;

let W = 0, H = 0, dpr = 1, paper = null, toothPat = null;
let idx = -1;
let trans = null;
let user = { z: 1, x: 0, y: 0 };
let cam = { shown: null, anim: null, rev: -1, scene: -1 };
let hits = [];
let hover = null;
let dirty = true;
let visible = true;
let raf = 0;
let last = performance.now();
let lastUI = {};

// ---------- Tamaño y papel ----------
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  for (const c of [canvas, layer, snap]) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  paper = makePaper(W, H, dpr);
  const tooth = makeTooth();
  toothPat = lg.createPattern(tooth, 'repeat');
  cam.anim = null;
  dirty = true;
}

function safeRect() {
  const note = $('#note').getBoundingClientRect();
  const top = $('#top').getBoundingClientRect();
  const dock = $('#dock').getBoundingClientRect();
  const wide = W >= 900;
  if (wide) {
    const x = note.right + 12;
    return { x, y: top.bottom + 6, w: W - x - 20, h: dock.top - top.bottom - 14 };
  }
  const bottom = Math.min(note.top, dock.top) - 4;
  return { x: 8, y: top.bottom + 2, w: W - 16, h: Math.max(160, bottom - top.bottom - 4) };
}

// ---------- Cámara ----------
function cameraFor(scene, now) {
  const want = scene.focus || scene.camera(scene.t);
  if (cam.scene !== idx || cam.rev === -1) {
    cam.scene = idx;
    cam.rev = scene.focusRev;
    cam.anim = null;
  } else if (cam.rev !== scene.focusRev) {
    cam.rev = scene.focusRev;
    if (!reduced && cam.shown) cam.anim = { from: cam.shown, start: now, dur: scene.focusDur || 1250 };
  }
  let r = want;
  if (cam.anim) {
    const u = clamp((now - cam.anim.start) / cam.anim.dur);
    r = lerpRect(cam.anim.from, want, E.inOut(u), 0.06);
    if (u >= 1) cam.anim = null;
  }
  cam.shown = r;
  return r;
}

function fit(r, sr, z = 1, px = 0, py = 0) {
  const s = Math.min(sr.w / r.w, sr.h / r.h) * z;
  const e = sr.x + sr.w / 2 - (r.x + r.w / 2) * s + px;
  const f = sr.y + sr.h / 2 - (r.y + r.h / 2) * s + py;
  return [s, e, f];
}

// Dibuja una escena completa sobre la capa de grafito indicada.
function paint(scene, g, w, h, d, r, sr, opts = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w * d, h * d);
  const F = new Frame(g, d, scene.t, { reduced, export: opts.export, ui: opts.ui ?? (W < 600 ? 0.86 : 1) });
  const [s, e, f] = fit(r, sr, opts.z ?? 1, opts.x ?? 0, opts.y ?? 0);
  F.setCamera(s, e, f);
  F.hover = hover;
  F.vw = w;
  F.vh = h;
  scene.draw(F);
  F.drawLabels();
  if (opts.masks) applyMasks(g, d, opts.masks);
  // El diente del papel se come un poco de grafito: textura fija, no cambia por cuadro.
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 0.38;
  g.fillStyle = opts.tooth || toothPat;
  g.fillRect(0, 0, w * d, h * d);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  return F;
}

// Márgenes de papel limpio bajo la nota, el encabezado y el dock (sólo en pantalla).
function screenMasks() {
  const note = $('#note').getBoundingClientRect();
  const top = $('#top').getBoundingClientRect();
  const dock = $('#dock').getBoundingClientRect();
  const m = [{ y0: top.bottom - 14, y1: top.bottom + 10, dir: 'down' }, { y0: dock.top - 6, y1: dock.top + 14, dir: 'up' }];
  if (W >= 900) m.push({ x0: note.right - 6, x1: note.right + 26, dir: 'left' });
  else m.push({ y0: note.top - 4, y1: note.top + 14, dir: 'up' });
  return m;
}
function applyMasks(g, d, masks) {
  g.setTransform(d, 0, 0, d, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  for (const k of masks) {
    let gr;
    if (k.dir === 'left') {
      gr = g.createLinearGradient(k.x0, 0, k.x1, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, k.x1, H);
    } else if (k.dir === 'down') {
      gr = g.createLinearGradient(0, k.y0, 0, k.y1);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, k.y1);
    } else {
      gr = g.createLinearGradient(0, k.y0, 0, k.y1);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gr;
      g.fillRect(0, k.y0, W, H - k.y0);
    }
  }
  g.globalCompositeOperation = 'source-over';
}

function composite(img, o = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = o.a ?? 1;
  if (o.s) {
    const fx = o.fx * dpr, fy = o.fy * dpr;
    ctx.translate(fx, fy);
    ctx.rotate(o.rot || 0);
    ctx.scale(o.s, o.s);
    ctx.translate(-fx, -fy);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function render(now) {
  const scene = scenes[idx];
  const sr = safeRect();
  const r = cameraFor(scene, now);
  const F = paint(scene, lg, W, H, dpr, r, sr, { z: user.z, x: user.x, y: user.y, masks: screenMasks() });
  hits = F.hits;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(paper, 0, 0);
  if (trans) {
    const u = clamp((now - trans.start) / trans.dur);
    const dive = trans.mode === 'in';
    // Vieja escena: anticipa (retrocede apenas) y luego acelera hacia el foco.
    let so;
    if (u < 0.16) so = 1 - 0.03 * Math.sin((u / 0.16) * Math.PI * 0.5);
    else {
      const v = E.in((u - 0.16) / 0.84);
      so = dive ? lerp(0.97, 3.2, v) : lerp(0.97, 0.32, v);
    }
    const ao = 1 - E.sine(clamp((u - 0.2) / 0.5));
    // Nueva escena: nace desde el mismo punto y se asienta.
    const v2 = E.out5(clamp((u - 0.28) / 0.72));
    const sn = dive ? lerp(0.38, 1, v2) : lerp(2.3, 1, v2);
    const an = E.sine(clamp((u - 0.3) / 0.45));
    composite(layer, { a: an, s: sn, fx: trans.fx, fy: trans.fy, rot: (1 - v2) * trans.rot });
    composite(snap, { a: ao, s: so, fx: trans.fx, fy: trans.fy, rot: -(1 - ao) * trans.rot * 0.6 });
    if (u >= 1) trans = null;
  } else {
    composite(layer);
  }
}

// ---------- Navegación ----------
function go(i, o = {}) {
  i = clamp(i, 0, scenes.length - 1);
  if (i === idx && !o.force) return;
  const prev = idx;
  const from = scenes[prev];
  const to = scenes[i];
  to.ensure();
  if (!to.visited) {
    to.visited = true;
    if (reduced) {
      to.t = to.dur;
      to.paused = !!to.loop;
    }
  }
  if (prev >= 0 && !reduced && !o.instant) {
    // Copia de la lámina saliente para la transición.
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, snap.width, snap.height);
    sg.drawImage(layer, 0, 0);
    const sr = safeRect();
    let fx = sr.x + sr.w / 2, fy = sr.y + sr.h / 2;
    const ep = i > prev ? from.exitPoint?.() : to.exitPoint?.();
    if (ep && cam.shown) {
      const [s, e, f] = fit(cam.shown, sr, user.z, user.x, user.y);
      if (i > prev) {
        fx = clamp(ep[0] * s + e, sr.x, sr.x + sr.w);
        fy = clamp(ep[1] * s + f, sr.y, sr.y + sr.h);
      }
    }
    const mode = i > prev ? (to.enterMode || 'in') : 'out';
    trans = { start: performance.now(), dur: 1150, fx, fy, mode, rot: (i > prev ? 1 : -1) * 0.012 };
  } else trans = null;
  idx = i;
  user = { z: 1, x: 0, y: 0 };
  cam.rev = -1;
  hover = null;
  if (location.hash.slice(1) !== SLUGS[i]) history.replaceState(null, '', '#' + SLUGS[i]);
  buildControls();
  lastUI = {};
  dirty = true;
  updateUI(true);
  wake();
}

// ---------- Interfaz HTML ----------
function buildChapterNav() {
  const nav = $('#chapters');
  nav.innerHTML = scenes
    .map((s, i) => `<button type="button" data-go="${i}"><span class="num">${s.num}</span><span class="lbl">${s.short}</span></button>`)
    .join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-go]');
    if (b) go(+b.dataset.go);
  });
  $('#phases').innerHTML = PHASES.map((p) => `<li><span>${p}</span></li>`).join('');
}

function buildControls() {
  const s = scenes[idx];
  // Contenedor nuevo en cada armado: los oyentes anteriores desaparecen con él.
  const box = $('#controls');
  const inner = document.createElement('div');
  inner.innerHTML = s.controls();
  box.replaceChildren(inner);
  s.bind(inner, api);
}

function setText(el, v) {
  if (el.textContent !== v) el.textContent = v;
}

function updateUI(force = false) {
  const s = scenes[idx];
  const key = s.noteKey(s.t);
  const ph = s.phaseIndex();
  const note = s.notes[key] || s.notes.intro;
  if (force || lastUI.key !== key || lastUI.idx !== idx) {
    setText($('#kicker'), `${s.num} / ${s.kicker}`);
    setText($('#title'), s.title);
    const text = $('#text');
    text.classList.remove('in');
    void text.offsetWidth;
    text.innerHTML = note;
    text.classList.add('in');
    canvas.setAttribute('aria-label', `${s.kicker}. ${s.alt}`);
  }
  // Las definiciones y los controles llegan después del movimiento.
  const showDefs = s.t >= s.phases[2] || reduced;
  if (force || lastUI.defs !== showDefs || lastUI.idx !== idx) {
    $('#defs').innerHTML = showDefs ? s.defs.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('') : '';
    $('#controls').classList.toggle('ready', showDefs || s.controlsEarly);
    setText($('#scope'), s.scope);
  }
  if (force || lastUI.ph !== ph || lastUI.idx !== idx) {
    [...$('#phases').children].forEach((li, i) => {
      li.classList.toggle('on', i === ph);
      li.classList.toggle('past', i < ph);
      if (i === ph) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }
  const pct = clamp(s.t / s.dur);
  $('#progress').style.transform = `scaleX(${pct})`;
  if (force || lastUI.paused !== s.paused) {
    const b = $('#play');
    b.setAttribute('aria-pressed', String(s.paused));
    b.querySelector('.lbl').textContent = s.paused ? 'Continuar' : 'Pausar';
    b.setAttribute('aria-label', s.paused ? 'Continuar la animación' : 'Pausar la animación');
    b.classList.toggle('is-paused', s.paused);
  }
  if (force || lastUI.idx !== idx) {
    [...$('#chapters').children].forEach((b, i) => {
      if (i === idx) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    $('#prev').disabled = idx === 0;
    $('#next').disabled = idx === scenes.length - 1;
    $('#next .lbl').textContent = idx === scenes.length - 2 ? 'Final' : 'Siguiente';
    document.title = `${s.num} ${s.kicker} · Dentro del microondas`;
  }
  const rf = user.z === 1 && !user.x && !user.y && !s.focus;
  if ($('#reframe').disabled !== rf) $('#reframe').disabled = rf;
  s.syncControls?.($('#controls'));
  lastUI = { key, idx, ph, defs: showDefs, paused: s.paused, z: user.z };
}

const api = {
  wake: () => wake(),
  go,
  reduced: () => reduced,
  toast,
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- Bucle ----------
function loop(now) {
  raf = 0;
  if (!visible) return;
  const dt = Math.min(64, now - last);
  last = now;
  const s = scenes[idx];
  if (!s.paused) s.tick(dt);
  const busy = !s.paused && s.animating();
  if (busy || dirty || trans || cam.anim || s.busy?.()) {
    render(now);
    dirty = false;
  }
  updateUI();
  if (busy || trans || cam.anim || s.busy?.()) raf = requestAnimationFrame(loop);
}

function wake() {
  dirty = true;
  if (!raf && visible) {
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

// ---------- Controles ----------
function togglePause() {
  const s = scenes[idx];
  s.paused = !s.paused;
  toast(s.paused ? 'En pausa' : 'Continúa');
  wake();
}
function replay() {
  const s = scenes[idx];
  s.reset();
  s.paused = false;
  user = { z: 1, x: 0, y: 0 };
  buildControls();
  lastUI = {};
  wake();
}
function complete() {
  const s = scenes[idx];
  s.t = Math.max(s.t, s.dur);
  s.complete?.();
  wake();
}
function zoomBy(f, cx, cy) {
  const sr = safeRect();
  cx ??= sr.x + sr.w / 2;
  cy ??= sr.y + sr.h / 2;
  const nz = clamp(user.z * f, 1, 6);
  const k = nz / user.z;
  // Mantener fijo el punto bajo el cursor.
  const ox = sr.x + sr.w / 2 + user.x, oy = sr.y + sr.h / 2 + user.y;
  user.x += (cx - ox) * (1 - k);
  user.y += (cy - oy) * (1 - k);
  user.z = nz;
  if (nz === 1) user.x = user.y = 0;
  wake();
}
function reframe() {
  user = { z: 1, x: 0, y: 0 };
  scenes[idx].clearFocus?.();
  wake();
}

$('#prev').addEventListener('click', () => go(idx - 1));
$('#next').addEventListener('click', () => go(idx + 1));
$('#play').addEventListener('click', togglePause);
$('#replay').addEventListener('click', replay);
$('#full').addEventListener('click', complete);
$('#zin').addEventListener('click', () => zoomBy(1.5));
$('#reframe').addEventListener('click', reframe);
$('#expSection').addEventListener('click', () => exportPNG(false));
$('#expFinal').addEventListener('click', () => exportPNG(true));

window.addEventListener('keydown', (e) => {
  if (e.altKey || e.metaKey || e.ctrlKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'select' || tag === 'textarea';
  const onButton = tag === 'button' || tag === 'summary' || tag === 'a';
  if (typing && e.key !== 'Escape') return;
  switch (e.key) {
    case 'ArrowRight': case 'PageDown': go(idx + 1); break;
    case 'ArrowLeft': case 'PageUp': go(idx - 1); break;
    case 'Home': go(0); break;
    case 'End': go(scenes.length - 1); break;
    case ' ': if (onButton) return; togglePause(); break;
    case 'r': case 'R': replay(); break;
    case 'c': case 'C': complete(); break;
    case '+': case '=': zoomBy(1.5); break;
    case '-': zoomBy(1 / 1.5); break;
    case '0': reframe(); break;
    case 'Escape': reframe(); break;
    default:
      if (/^[1-6]$/.test(e.key)) go(+e.key - 1);
      else return;
  }
  e.preventDefault();
});

// ---------- Puntero, gestos táctiles y rueda ----------
const ptrs = new Map();
let gesture = null;
function hitAt(x, y) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (inside(h.pts, x, y)) return h;
  }
  return null;
}
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function worldAt(x, y) {
  const s = scenes[idx];
  const [k, e, f] = fit(cam.shown || s.camera(s.t), safeRect(), user.z, user.x, user.y);
  return [(x - e) / k, (y - f) / k];
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    gesture = { kind: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: user.z };
    return;
  }
  const h = hitAt(e.clientX, e.clientY);
  gesture = { kind: 'tap', x0: e.clientX, y0: e.clientY, ux: user.x, uy: user.y, hit: h, t0: performance.now() };
  if (h && h.drag) {
    gesture.kind = 'drag';
    scenes[idx].onDrag?.(h.id, worldAt(e.clientX, e.clientY), 'start');
    wake();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (!gesture) {
    const h = hitAt(e.clientX, e.clientY);
    const id = h ? h.id : null;
    canvas.style.cursor = h ? (h.drag ? 'grab' : 'pointer') : user.z > 1 ? 'move' : 'default';
    if (id !== hover) {
      hover = id;
      scenes[idx].onHover?.(id);
      wake();
    }
    return;
  }
  if (gesture.kind === 'pinch' && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const target = clamp(gesture.z * (d / gesture.d), 1, 6);
    zoomBy(target / user.z, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    return;
  }
  if (gesture.kind === 'drag') {
    scenes[idx].onDrag?.(gesture.hit.id, worldAt(e.clientX, e.clientY), 'move');
    wake();
    return;
  }
  const dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
  if (user.z > 1.01 && Math.hypot(dx, dy) > 4) {
    gesture.kind = 'pan';
    user.x = gesture.ux + dx;
    user.y = gesture.uy + dy;
    wake();
  }
});
function endPointer(e) {
  ptrs.delete(e.pointerId);
  if (!gesture) return;
  const g = gesture;
  if (g.kind === 'pinch') {
    if (ptrs.size === 0) gesture = null;
    return;
  }
  gesture = null;
  if (e.type === 'pointercancel') return;
  if (g.kind === 'drag') {
    scenes[idx].onDrag?.(g.hit.id, worldAt(e.clientX, e.clientY), 'end');
    wake();
    return;
  }
  if (g.kind === 'pan') return;
  const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - g.t0 < 900) {
    go(idx + (dx < 0 ? 1 : -1));
    return;
  }
  if (Math.hypot(dx, dy) < 10) {
    scenes[idx].onPick?.(g.hit ? g.hit.id : null, worldAt(e.clientX, e.clientY));
    buildControlsSoft();
    wake();
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => {
  if (hover) {
    hover = null;
    scenes[idx].onHover?.(null);
    wake();
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
}, { passive: false });

function buildControlsSoft() {
  scenes[idx].syncControls?.($('#controls'));
}

// ---------- Exportación ----------
async function exportPNG(final) {
  const scene = final ? scenes[5] : scenes[idx];
  scene.ensure();
  const w = 2400, h = 1600, d = 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const og = out.getContext('2d');
  const lay = document.createElement('canvas');
  lay.width = w;
  lay.height = h;
  const lc = lay.getContext('2d');
  const tooth = lc.createPattern(makeTooth(), 'repeat');
  const savedT = scene.t;
  if (final) scene.t = Math.max(scene.t, scene.dur + (scene.cycleEnd || 0));
  const r = final ? scene.restCamera() : scene.focus || scene.camera(scene.t);
  const sr = { x: 90, y: 90, w: w - 180, h: h - 330 };
  paint(scene, lc, w, h, d, r, sr, { export: true, ui: 1.6, tooth });
  scene.t = savedT;
  og.drawImage(makePaper(w, h, 1), 0, 0);
  og.globalCompositeOperation = 'multiply';
  og.drawImage(lay, 0, 0);
  og.globalCompositeOperation = 'source-over';
  // Rótulo de la lámina.
  og.strokeStyle = 'rgba(38,38,44,.55)';
  og.lineWidth = 1.4;
  og.beginPath();
  og.moveTo(90, h - 200);
  og.lineTo(w - 90, h - 198);
  og.stroke();
  og.fillStyle = INK.g;
  og.font = `34px ${LABEL_FONT}`;
  og.fillText(`${scene.num} / ${scene.kicker} — ${scene.title}`, 90, h - 140);
  og.font = `22px ${NOTE_FONT}`;
  og.fillStyle = 'rgba(38,38,44,.8)';
  const note = (final ? scene.notes.rest : scene.notes[scene.noteKey(scene.t)] || scene.notes.intro).replace(/<[^>]+>/g, '');
  wrap(og, note, 90, h - 98, w - 1080, 30);
  og.font = `16px ${MONO_FONT}`;
  og.fillStyle = INK.b;
  og.textAlign = 'right';
  og.fillText('DENTRO DEL MICROONDAS · CUADERNO DE INGENIERÍA', w - 90, h - 140);
  wrapRight(og, scene.scope, w - 90, h - 110, 820, 22);
  og.textAlign = 'left';
  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `microondas-${final ? 'lamina-final' : SLUGS[idx]}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $('#exportMenu').open = false;
  toast(final ? 'Lámina final exportada (PNG)' : 'Sección exportada (PNG)');
  wake();
}
function wrapRight(g, text, x, y, maxW, lh) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, x, y + i * lh));
}
function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(/\s+/);
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, yy);
      line = w;
      yy += lh;
      if (yy > y + lh * 2.2) { g.fillText(line + '…', x, yy); return; }
    } else line = test;
  }
  g.fillText(line, x, yy);
}

// ---------- Visibilidad: suspender fuera de pantalla ----------
document.addEventListener('visibilitychange', () => {
  visible = !document.hidden;
  if (visible) wake();
});
new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting && !document.hidden;
  if (visible) wake();
}).observe(canvas);
mqReduced.addEventListener('change', (e) => {
  reduced = e.matches;
  wake();
});
let rz = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(rz);
  rz = requestAnimationFrame(() => { resize(); wake(); });
});
window.addEventListener('hashchange', () => {
  const i = SLUGS.indexOf(location.hash.slice(1));
  if (i >= 0 && i !== idx) go(i);
});

// ---------- Inicio ----------
buildChapterNav();
resize();
const start = SLUGS.indexOf(location.hash.slice(1));
go(start >= 0 ? start : 0, { instant: true });
window.__app = { scenes, go, wake, get idx() { return idx; }, complete, exportPNG };
