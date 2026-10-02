// FINAL / TODO ESTABA CONECTADO — una sola lámina con todos los diagramas y el ciclo completo.
import { E, seg, clamp, lerp, lerpRect, rect, pad } from '../core.js';
import { S, bez, rectPts, arc, MONO_FONT, LABEL_FONT } from '../pencil.js';
import { Scene } from '../scene.js';
import { MAP_OPEN } from './map.js';
import { POWER_VIEW, POWER_T } from './power.js';
import { JOURNEY_T } from './journey.js';
import { FOOD_K, FOOD_T } from './food.js';
import { DOOR_K } from './door.js';

const SHEET = rect(0, 0, 1600, 1000);
const PANELS = {
  door: { r: rect(40, 650, 470, 286), ch: 4, cap: '05 · la puerta' },
  map: { r: rect(560, 300, 480, 382), ch: 0, cap: '01 · el mapa' },
  power: { r: rect(30, 70, 640, 242), ch: 1, cap: '02 · de electricidad a microondas' },
  cut: { r: rect(735, 50, 150, 150), ch: 1, cap: '02 · corte del magnetrón' },
  room: { r: rect(1095, 70, 470, 294), ch: 2, cap: '03 · dentro de la cavidad' },
  plates: { r: rect(1055, 660, 515, 194), ch: 3, cap: '04 · plato quieto / girando' },
  mols: { r: rect(610, 745, 330, 206), ch: 3, cap: '04 · moléculas de agua' },
};
const ORDER = ['door', 'map', 'power', 'cut', 'room', 'plates', 'mols'];
const DRAW = {
  door: [0, 2600], map: [700, 3000], power: [1500, 3000], cut: [2400, 2300], room: [2900, 2800], plates: [3600, 3000], mols: [4200, 2400],
};
const STEPS = [
  ['cerrar la puerta', 2400, 'door'],
  ['activar la alimentación', 2300, 'power'],
  ['generar RF', 2500, 'cut'],
  ['conducirla a la cavidad', 2700, 'room'],
  ['absorber energía', 3000, 'plates'],
  ['detener la generación', 2600, 'power'],
];
const CYCLE = STEPS.reduce((s, x) => s + x[1], 0);

export class FinalScene extends Scene {
  constructor(chapters) {
    super();
    this.ch = chapters;
    this.num = 'FIN';
    this.short = 'Todo conectado';
    this.kicker = 'Todo estaba conectado';
    this.title = 'Una lámina, cinco respuestas';
    this.alt = 'Lámina completa: el mapa del horno al centro, rodeado por el diagrama eléctrico, el corte del magnetrón, el interior de la cavidad, las moléculas de agua, la comparación de platos y la puerta, unidos por líneas guía.';
    this.scope = 'Lámina conceptual. Cada panel conserva sus límites: tiempos didácticos y patrones cualitativos.';
    this.dur = 11200;
    this.phases = [0, 600, 6800, 10400];
    this.cycleStart = null;
    this.focusDur = 1200;
    this.enterMode = 'out';
    this.notes = {
      intro: '<p>Alejémonos: todo lo que vimos por separado trabaja junto, en una sola lámina.</p>',
      rest: '<p>El <strong>magnetrón</strong> produce las microondas; la <strong>guía</strong> las lleva a la <strong>cavidad</strong>, donde rebotan; el <strong>agua</strong> de la comida las absorbe y se calienta; el <strong>plato</strong> gira para repartir; la <strong>puerta</strong> deja ver y las mantiene adentro. Tocá un panel para acercarlo.</p>',
      c0: '<p><strong>1 · Cerrar la puerta.</strong> Los ganchos aprietan los enclavamientos. Sin eso, nada puede encenderse.</p>',
      c1: '<p><strong>2 · Activar la alimentación.</strong> El control deja pasar la corriente; transformador, condensador y diodo preparan la alta tensión.</p>',
      c2: '<p><strong>3 · Generar RF.</strong> En el magnetrón, los electrones giran frente a las cavidades y las hacen oscilar a 2,45 GHz.</p>',
      c3: '<p><strong>4 · Conducirla a la cavidad.</strong> La guía lleva la onda; las paredes de metal la reflejan y forman zonas fuertes y débiles.</p>',
      c4: '<p><strong>5 · Absorber energía.</strong> Las moléculas de agua giran con el campo y rozan a sus vecinas: la comida se calienta. El plato gira para repartir.</p>',
      c5: '<p><strong>6 · Detener la generación.</strong> Al terminar el tiempo (o al abrir la puerta) se corta la alimentación y el magnetrón deja de producir RF al instante. La comida sigue caliente; el horno ya no emite.</p>',
    };
    this.defs = [
      ['¿Qué produce las microondas?', 'el magnetrón, alimentado con alta tensión.'],
      ['¿Cómo llegan al alimento?', 'por la guía de ondas hasta la cavidad, rebotando en el metal.'],
      ['¿Por qué lo calientan?', 'el agua absorbe la energía al girar con el campo y rozar a sus vecinas.'],
      ['¿Para qué gira el plato?', 'para pasear la comida por zonas fuertes y débiles.'],
      ['¿Qué hace la puerta?', 'deja ver, refleja la RF y, al abrirse, corta la generación.'],
    ];
  }

  resetState() { this.cycleStart = null; this.panelFocus = null; }

  build() {
    for (const c of this.ch) c.ensure();
    this.frame = [S(rectPts(14, 14, 1572, 972), { w: 1.4, d: 0.6, over: 5 }), S(rectPts(22, 22, 1556, 956), { w: 0.8, d: 0.35, over: 3 })];
    this.panelFrames = {};
    for (const k of ORDER) {
      const r = PANELS[k].r;
      this.panelFrames[k] = k === 'cut' ? S(arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 + 4, r.h / 2 + 4, 0, Math.PI * 2, 50), { w: 1.2, d: 0.6 }) : S(rectPts(r.x - 6, r.y - 6, r.w + 12, r.h + 12), { w: 1, d: 0.45, over: 3 });
    }
    // Rótulo de la lámina.
    const tb = rect(1060, 880, 510, 96);
    this.tb = tb;
    this.tbStrokes = [S(rectPts(tb.x, tb.y, tb.w, tb.h), { w: 1.5 }), S([[tb.x, tb.y + 44], [tb.x + tb.w, tb.y + 44]], { w: 1 }), S([[tb.x + 330, tb.y + 44], [tb.x + 330, tb.y + tb.h]], { w: 1 })];
    // Conexiones: de cada pieza del mapa al panel que la explica.
    const m = this.ch[0];
    const mt = m.dur + 2000;
    const c = (id) => {
      const b = m.partBox(id, mt);
      return this.mapPoint([b.x + b.w / 2, b.y + b.h / 2]);
    };
    const doorPt = this.mapPoint([330, 820]);
    const P = PANELS;
    const link = (a, b, bend, label, key, lo = [8, -8]) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const c1 = [lerp(a[0], b[0], 0.3) - dy * bend, lerp(a[1], b[1], 0.3) + dx * bend];
      const c2 = [lerp(a[0], b[0], 0.7) - dy * bend, lerp(a[1], b[1], 0.7) + dx * bend];
      const pts = bez(a, c1, c2, b, 30);
      const mid = pts[15];
      return { key, label, lo, pts, mid, s: S(pts, { ink: 'b', w: 1.3, d: 0.75, dash: [8, 6] }), w: S(pts, { ink: 'w', w: 3.2, d: 0.85, strands: 3 }), head: this.head(pts) };
    };
    this.links = [
      link(c('power'), [P.power.r.x + P.power.r.w * 0.55, P.power.r.y + P.power.r.h + 6], 0.25, 'alimenta', 'power', [-80, -4]),
      link(c('magnetron'), [P.cut.r.x + P.cut.r.w / 2, P.cut.r.y + P.cut.r.h + 6], -0.2, 'genera RF', 'cut', [-84, -6]),
      link(c('cavity'), [P.room.r.x - 6, P.room.r.y + P.room.r.h * 0.7], -0.15, 'conduce y refleja', 'room', [16, 28]),
      link(c('plate'), [P.plates.r.x + 40, P.plates.r.y - 6], 0.2, 'gira y reparte', 'plates', [14, 22]),
      link([P.plates.r.x - 6, P.plates.r.y + P.plates.r.h * 0.6], [P.mols.r.x + P.mols.r.w + 6, P.mols.r.y + P.mols.r.h * 0.4], 0.1, 'absorbe → calor', 'mols'),
      link(doorPt, [P.door.r.x + P.door.r.w - 40, P.door.r.y - 6], 0.15, 'deja ver y corta', 'door', [-130, -6]),
    ];
  }

  head(pts) {
    const b = pts[pts.length - 1], a = pts[pts.length - 3];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const l = 12;
    return S([[b[0] - Math.cos(ang - 0.45) * l, b[1] - Math.sin(ang - 0.45) * l], b, [b[0] - Math.cos(ang + 0.45) * l, b[1] - Math.sin(ang + 0.45) * l]], { ink: 'b', w: 1.4, d: 0.8, over: 0 });
  }

  // Punto del mundo del capítulo 01 → lámina.
  mapPoint([x, y]) {
    const r = PANELS.map.r, ir = MAP_OPEN;
    const sc = Math.min(r.w / ir.w, r.h / ir.h);
    const ox = r.x + (r.w - ir.w * sc) / 2 - ir.x * sc, oy = r.y + (r.h - ir.h * sc) / 2 - ir.y * sc;
    return [ox + x * sc, oy + y * sc];
  }

  restCamera() { return SHEET; }
  camera(t) {
    const start = pad(PANELS.door.r, 20);
    return lerpRect(start, SHEET, E.inOut(seg(t, 200, 3600)), 0.05);
  }
  exitPoint() { return [PANELS.door.r.x + PANELS.door.r.w / 2, PANELS.door.r.y + PANELS.door.r.h / 2]; }

  cycleInfo(t) {
    if (this.cycleStart == null) return null;
    let c = t - this.cycleStart;
    if (c < 0 || c > CYCLE + 600) return null;
    let i = 0;
    while (i < STEPS.length - 1 && c >= STEPS[i][1]) { c -= STEPS[i][1]; i++; }
    return { i, local: c, total: t - this.cycleStart };
  }
  stepStart(i) { let s = 0; for (let k = 0; k < i; k++) s += STEPS[k][1]; return s; }

  noteKey(t) {
    const cy = this.cycleInfo(t);
    if (cy) return 'c' + cy.i;
    return t < this.dur ? 'intro' : 'rest';
  }
  busy() { return !this.paused && !!this.cycleInfo(this.t); }

  controls() {
    return `<p class="group-label">Lámina</p>
      <button type="button" data-act="cycle" class="cta">Ver el ciclo completo</button>
      <button type="button" data-act="open" disabled>Abrir el capítulo del panel</button>`;
  }
  bind(box, app) {
    this.app = app;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'cycle') {
        if (this.t < this.dur) this.t = this.dur;
        this.cycleStart = this.t;
        this.paused = false;
        this.panelFocus = null;
        this.setFocus(null);
      } else if (b.dataset.act === 'open' && this.panelFocus) {
        app.go(PANELS[this.panelFocus].ch);
        return;
      }
      app.wake();
    });
  }
  syncControls(box) {
    const o = box.querySelector('[data-act="open"]');
    if (o) {
      o.disabled = !this.panelFocus;
      o.textContent = this.panelFocus ? `Abrir el capítulo ${PANELS[this.panelFocus].cap.slice(0, 2)}` : 'Abrir el capítulo del panel';
    }
    const c = box.querySelector('[data-act="cycle"]');
    if (c) c.textContent = this.cycleInfo(this.t) ? 'Reiniciar el ciclo' : 'Ver el ciclo completo';
  }
  onPick(id) {
    if (id && PANELS[id] && id !== this.panelFocus) {
      this.panelFocus = id;
      if (this.t < this.dur) this.t = this.dur;
      this.setFocus(pad(PANELS[id].r, 36, 30));
    } else {
      this.panelFocus = null;
      this.setFocus(null);
    }
  }
  clearFocus() { this.panelFocus = null; this.setFocus(null); }

  // Estado temporal de un capítulo mientras se dibuja dentro de la lámina.
  with(scene, patch, fn) {
    const saved = {};
    for (const k of Object.keys(patch)) { saved[k] = scene[k]; scene[k] = patch[k]; }
    try { fn(); } finally { Object.assign(scene, saved); }
  }

  draw(R) {
    const t = R.t;
    const cy = R.export ? null : this.cycleInfo(t);
    R.seq(this.frame, E.draw(seg(t, 0, 900)), {}, 0.3);
    const [map, power, journey, food, door] = this.ch;
    const assembling = (k) => seg(t, ...DRAW[k]);
    const active = cy ? STEPS[cy.i][2] : null;
    const at = (i) => (cy ? cy.total - this.stepStart(i) : -1); // tiempo desde el inicio del paso i

    const panel = (k, fn) => {
      const a = assembling(k);
      if (a <= 0) return;
      const r = PANELS[k].r;
      R.st(this.panelFrames[k], E.draw(a));
      R.mute = true;
      const t0 = R.t;
      if (k === 'cut') {
        R.erase(arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, Math.PI * 2, 40), 1);
        R.g.save();
        R.g.beginPath();
        R.g.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, Math.PI * 2);
        R.g.clip();
        fn(a, r);
        R.g.restore();
      } else fn(a, r);
      R.t = t0;
      R.mute = false;
      R.text(r.x, r.y - 14 - (k === 'cut' ? 4 : 0), PANELS[k].cap, clamp(a * 2 - 0.6), { size: 15, font: MONO_FONT, ink: 'b', a: 0.85 });
      R.hit(k, rectPts(r.x, r.y, r.w, r.h));
      // Durante el ciclo, los paneles que esperan se aclaran.
      if (cy && active !== k && !(active === 'plates' && k === 'mols') && !(active === 'power' && k === 'map') && !(active === 'cut' && k === 'map')) {
        R.erase(rectPts(r.x - 8, r.y - 8, r.w + 16, r.h + 16), 0.62);
      }
    };

    // Puerta.
    panel('door', (a, r) => {
      let patch = { openAt: -1, closeAt: -1, forceOff: false };
      let dt = lerp(0, door.dur, a);
      if (cy) {
        if (cy.i === 0) { patch = { openAt: 0, closeAt: this.cycleStart, forceOff: false }; dt = this.t; }
        else if (cy.i === 5) patch.forceOff = true;
        if (cy.i > 0) dt = door.dur;
      }
      this.with(door, patch, () => {
        R.t = dt;
        R.nestRect(r, DOOR_K.wide, () => door.draw(R), { clip: true });
      });
    });
    // Mapa.
    panel('map', (a, r) => {
      const sel = cy ? ({ 1: 'power', 2: 'magnetron', 3: 'cavity', 4: 'plate', 5: 'power' })[cy.i] ?? null : null;
      this.with(map, { sel, hov: null }, () => {
        R.t = lerp(0, map.dur + 1000, a);
        R.nestRect(r, MAP_OPEN, () => map.draw(R), { clip: true });
      });
    });
    // Diagrama eléctrico.
    panel('power', (a, r) => {
      let pt = lerp(0, power.dur, a), off = false;
      if (cy) {
        if (cy.i === 0 || cy.i === 5) off = true;
        else pt = POWER_T.flow[0] + at(1) * 1.8;
      }
      this.with(power, { sel: null, arch: 'conv', powerOff: off, focus: null }, () => {
        R.t = pt;
        R.nestRect(r, POWER_VIEW, () => power.draw(R), { clip: true });
      });
    });
    // Corte del magnetrón.
    panel('cut', (a, r) => {
      let s = lerp(0, 9800, a);
      if (cy) s = cy.i < 2 || cy.i === 5 ? 3800 : 4300 + at(2) * 1.4;
      R.nestRect(r, rect(30, 30, 940, 940), () => power.drawCut(R, s));
    });
    // Interior de la cavidad.
    panel('room', (a, r) => {
      const J = JOURNEY_T;
      let jt = lerp(J.room[0], journey.dur, a);
      if (cy) jt = cy.i < 3 || cy.i === 5 ? J.room[0] + 3000 : J.waves[0] + at(3) * 1.6;
      R.nestRect(r, rect(0, 0, 1600, 1000), () => journey.drawRoom(R, jt, jt - J.room[0]), { clip: true });
    });
    // Platos.
    panel('plates', (a, r) => {
      const F = FOOD_T;
      let ft = lerp(F.split[0] + F.split[1], F.cmp[0] + F.cmp[1], a);
      if (cy) ft = cy.i < 4 ? F.cmp[0] : cy.i === 4 ? F.cmp[0] + at(4) * 4.5 : F.cmp[0] + STEPS[4][1] * 4.5;
      this.with(food, { cmpStart: F.cmp[0], showZones: true, focus: null }, () => {
        R.t = ft;
        R.nestRect(r, FOOD_K.both, () => food.draw(R), { clip: true });
      });
    });
    // Moléculas.
    panel('mols', (a, r) => {
      const F = FOOD_T;
      let mt = lerp(F.mol[0], F.heat[0] + 4000, a);
      if (cy) mt = cy.i === 4 ? F.fieldOn[0] + at(4) * 1.3 : F.mol[0] + 2400;
      R.nestRect(r, rect(0, 0, 1600, 1000), () => food.drawMolecules(R, mt), { clip: true });
    });

    // Conexiones entre capítulos, una por vez.
    this.links.forEach((L, i) => {
      const p = E.draw(seg(t, 6800 + i * 560, 700));
      if (p <= 0) return;
      R.st(L.s, p);
      if (p > 0.98) R.st(L.head, 1);
      R.text(L.mid[0] + L.lo[0], L.mid[1] + L.lo[1], L.label, clamp(p * 2 - 1), { size: 17, ink: 'b', font: LABEL_FONT });
      // Trazo cálido: la energía recorre la conexión en su paso del ciclo.
      if (cy) {
        const stepFor = { door: 0, power: 1, cut: 2, room: 3, plates: 4, mols: 4 }[L.key];
        if (stepFor === cy.i) R.st(L.w, E.draw(clamp(cy.local / 900)), { a: cy.i === 5 ? 0 : 0.9 });
      }
    });

    // Rótulo.
    const pt = seg(t, 9800, 1100);
    if (pt > 0) {
      const tb = this.tb;
      R.seq(this.tbStrokes, E.draw(pt), {}, 0.4);
      R.text(tb.x + 14, tb.y + 31, 'Dentro del microondas — lámina general', pt, { size: 21 });
      R.text(tb.x + 14, tb.y + 72, 'figs. 01–05 · esquema, sin escala', pt, { size: 14, font: MONO_FONT, ink: 'b' });
      R.text(tb.x + 344, tb.y + 72, 'cuaderno · grafito', pt, { size: 14, font: MONO_FONT, ink: 'b' });
    }

    // Pasos del ciclo.
    if (cy) {
      let x = 560;
      STEPS.forEach(([name], i) => {
        const y = i < 3 ? 698 : 718;
        const txt = `${i + 1} ${name}`;
        const on = i === cy.i, done = i < cy.i;
        R.text(x, y, txt, 1, { size: on ? 16 : 13, ink: on ? 'w' : 'g', a: on ? 1 : done ? 0.6 : 0.35, font: on ? LABEL_FONT : MONO_FONT });
        x += on ? txt.length * 7.6 + 16 : txt.length * 6.6 + 12;
        if (i === 2) x = 560;
      });
    }
  }
}
