// 04 / QUÉ LE PASA AL ALIMENTO — del plato a las moléculas y de vuelta, con la comparación de platos.
import { E, seg, clamp, lerp, lerpRect, rect, TAU, rng, hash, noise } from '../core.js';
import { S, arc, hatch, rectPts, spline, MONO_FONT, INK } from '../pencil.js';
import { Scene } from '../scene.js';
import { fieldI } from './field.js';

const MAIN = { cx: 800, cy: 600, rx: 380, ry: 160 };
const LEFT = { cx: 440, cy: 610, rx: 280, ry: 118 };
const RIGHT = { cx: 1160, cy: 610, rx: 280, ry: 118 };
const FOOD_R = 0.72; // radio de la porción relativo al plato
const CR = rect(838, 520, 24, 15); // pedacito de comida: dentro vive el mundo molecular

const T = {
  guides: [0, 700],
  plate: [700, 1300],
  food: [1700, 1600],
  cube: [4000, 800],
  dip: [4800, 300],
  dive: [5100, 2300],
  mol: [5700, 2400],
  fieldOn: [8200, 600],
  heat: [9600, 3000],
  back: [12600, 2200],
  zones: [14200, 1500],
  warm: [15200, 1400],
  split: [17000, 1700],
  cmp: [18800, 16000],
};
const RINGS = 9, SECT = 30;
const ROT_PERIOD = 8000; // ms por vuelta (tiempo comprimido)

const K = {
  plate: rect(330, 300, 940, 560),
  cube: CR,
  both: rect(110, 330, 1380, 520),
};

export class FoodScene extends Scene {
  constructor() {
    super();
    this.num = '04';
    this.short = 'Alimento';
    this.kicker = 'Qué le pasa al alimento';
    this.title = 'Moléculas que giran, comida que se calienta';
    this.alt = 'Un plato con comida; la cámara entra en un pedacito y muestra moléculas de agua girando con el campo alterno y agitándose, lo que se convierte en calor. Luego compara un plato quieto con uno que gira sobre un patrón de zonas fuertes y débiles.';
    this.scope = 'Ilustración cualitativa: sin temperaturas calculadas. Moléculas y campo en tiempo didáctico; giro del plato comprimido.';
    this.dur = T.cmp[0] + T.cmp[1];
    this.phases = [0, 700, 4000, T.split[0]];
    this.loop = false;
    this.showZones = true;
    this.cmpStart = T.cmp[0];
    this.notes = {
      intro: '<p>Una porción de comida sobre el plato giratorio. Casi toda la comida tiene <strong>agua</strong>.</p>',
      dive: '<p>Acerquémonos a un pedacito, mucho más chico que un grano de sal…</p>',
      mol: '<p>Las moléculas de agua son <strong>polares</strong>: un extremo tiene una leve carga positiva (δ+) y el otro, negativa (δ−). El campo eléctrico de la onda las hace girar; cuando el campo se invierte, giran hacia el otro lado.</p>',
      heat: '<p>Al girar, empujan y rozan a sus vecinas y no llegan a seguir al campo. Esa agitación desordenada es <span class="w">calor</span>: la energía de la onda quedó <strong>absorbida</strong> en la comida.</p>',
      plate: '<p>De vuelta al plato: donde el campo es fuerte, las moléculas se agitan más y esa parte absorbe más energía. Donde es débil, absorbe menos.</p>',
      cmp: '<p>Con el plato <strong>quieto</strong>, las mismas partes quedan siempre en zonas fuertes o débiles. <strong>Girando</strong>, cada parte pasa por ambas: el calentamiento se reparte mejor, aunque no queda perfecto. Revolver y dejar reposar ayuda: el calor también se mueve por conducción.</p>',
    };
    this.defs = [
      ['Molécula polar', 'molécula con un extremo levemente positivo y otro levemente negativo, como la del agua.'],
      ['Campo eléctrico', 'la parte de la onda que empuja a las cargas eléctricas; en el horno cambia de sentido unas 4.900 millones de veces por segundo.'],
      ['Absorción', 'la energía de la onda pasa a la comida y la onda se debilita al atravesarla.'],
      ['Conducción', 'el calor pasa de las partes calientes a las frías, dentro de la comida.'],
    ];
  }

  resetState() {
    this.heat = null;
    this.showZones = true;
    this.cmpStart = T.cmp[0];
  }

  build() {
    this.guides = [
      S(arc(MAIN.cx, MAIN.cy, MAIN.rx + 40, MAIN.ry + 18, 0, TAU, 80), { ink: 'b', w: 0.9, d: 0.35, dash: [8, 8] }),
      S([[MAIN.cx - MAIN.rx - 80, MAIN.cy], [MAIN.cx + MAIN.rx + 80, MAIN.cy]], { ink: 'b', w: 0.8, d: 0.35 }),
      S([[MAIN.cx, MAIN.cy - 260], [MAIN.cx, MAIN.cy + 220]], { ink: 'b', w: 0.8, d: 0.3, dash: [4, 7] }),
    ];
    this.plateStrokes = (P) => [
      S(arc(P.cx, P.cy, P.rx, P.ry, 0, TAU, 80), { w: 2, over: 0 }),
      S(arc(P.cx, P.cy, P.rx * 0.9, P.ry * 0.9, 0.2, TAU + 0.1, 80), { w: 0.9, d: 0.5, over: 0 }),
      S(arc(P.cx, P.cy + P.ry * 0.14, P.rx, P.ry, 0.15, Math.PI - 0.15, 40), { w: 1.3, d: 0.7, over: 0 }),
    ];
    this.mainPlate = this.plateStrokes(MAIN);
    this.mainPlateHatch = hatch(12, (u) => arc(MAIN.cx, MAIN.cy + 6, MAIN.rx * (0.93 + u * 0.06), MAIN.ry * (0.93 + u * 0.08), 0.5 + u * 0.3, 2.6 - u * 0.2, 30), { d: 0.3, trim: 0.03 });
    // Porción de comida: un montículo con rayado que sigue su curvatura.
    const food = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU;
      const wob = 1 + 0.05 * noise(77, i / 7) + 0.03 * Math.sin(a * 5);
      food.push([MAIN.cx + Math.cos(a) * MAIN.rx * FOOD_R * wob, MAIN.cy + Math.sin(a) * MAIN.ry * FOOD_R * wob - 26]);
    }
    this.food = [S(food, { w: 1.8, over: 0 })];
    this.foodSil = food;
    this.foodHatch = hatch(16, (u) => arc(MAIN.cx + 10, MAIN.cy - 26 + u * 26, MAIN.rx * FOOD_R * (0.95 - u * 0.5), MAIN.ry * FOOD_R * (0.85 - u * 0.5), 0.3, Math.PI - 0.6 - u * 0.4, 26), { d: 0.33, trim: 0.05 });
    this.foodBase = [S(arc(MAIN.cx, MAIN.cy - 4, MAIN.rx * FOOD_R * 1.02, MAIN.ry * FOOD_R * 1.02, 0.05, Math.PI - 0.05, 40), { w: 1.2, d: 0.6, over: 0 })];
    // El pedacito: un cubo cuya cara frontal es CR.
    const c = CR, dx = 7, dy = -5;
    this.cube = [
      S(rectPts(c.x, c.y, c.w, c.h), { w: 0.9, h: 0.6, taper: 2, over: 0 }),
      S([[c.x, c.y], [c.x + dx, c.y + dy], [c.x + c.w + dx, c.y + dy], [c.x + c.w, c.y]], { w: 0.8, h: 0.6, taper: 2, over: 0 }),
      S([[c.x + c.w + dx, c.y + dy], [c.x + c.w + dx, c.y + c.h + dy], [c.x + c.w, c.y + c.h]], { w: 0.8, h: 0.6, taper: 2, over: 0 }),
    ];
    // Mundo molecular: moléculas en una red irregular.
    const r = rng(404);
    this.mols = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      this.mols.push({
        x: 240 + i * 225 + (r() - 0.5) * 70,
        y: 300 + j * 175 + (r() - 0.5) * 50,
        a0: r() * TAU,
        lag: 0.5 + r() * 0.7,
        amp: 0.5 + r() * 0.35,
        k: this.mols.length,
      });
    }
    this.cmpFoodSeed = 9;
  }

  // ---------- Simulación cualitativa de energía absorbida en la comparación ----------
  floorOf(P, x, y) {
    // Coordenadas locales del plato (disco unidad) → piso de la cavidad.
    return [0.5 + x * 0.3, 0.52 + y * 0.32];
  }
  ensureHeat(time) {
    const local = time - this.cmpStart;
    if (!this.heat || local < this.heatT || this.heatKey !== this.cmpStart) {
      this.heatKey = this.cmpStart;
      this.heat = { still: new Float32Array(RINGS * SECT), turn: new Float32Array(RINGS * SECT) };
      this.heatT = 0;
    }
    const target = clamp(local, 0, T.cmp[1]);
    const step = 40;
    while (this.heatT + step <= target) {
      const th = ((this.heatT / ROT_PERIOD) * TAU) % TAU;
      for (let i = 0; i < RINGS; i++) {
        const rr = ((i + 0.5) / RINGS) * FOOD_R;
        for (let j = 0; j < SECT; j++) {
          const a = ((j + 0.5) / SECT) * TAU;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
          const idx = i * SECT + j;
          this.heat.still[idx] += fieldI(...this.floorOf(LEFT, x, y)) * step;
          const xr = Math.cos(a + th) * rr, yr = Math.sin(a + th) * rr;
          this.heat.turn[idx] += fieldI(...this.floorOf(RIGHT, xr, yr)) * step;
        }
      }
      this.heatT += step;
    }
  }

  camera(t) {
    if (t < T.dip[0]) return K.plate;
    if (t < T.dive[0]) {
      const u = Math.sin(seg(t, ...T.dip) * Math.PI) * 0.04;
      const r = K.plate;
      return { x: r.x - r.w * u / 2, y: r.y - r.h * u / 2, w: r.w * (1 + u), h: r.h * (1 + u) };
    }
    if (t < T.back[0]) return lerpRect(K.plate, K.cube, E.inOut(seg(t, ...T.dive)));
    if (t < T.split[0]) return lerpRect(K.cube, K.plate, E.inOut(seg(t, ...T.back)));
    return lerpRect(K.plate, K.both, E.inOut(seg(t, ...T.split)), -0.04);
  }

  noteKey(t) {
    if (t < T.cube[0]) return 'intro';
    if (t < T.mol[0] + 1200) return 'dive';
    if (t < T.heat[0]) return 'mol';
    if (t < T.back[0] + 1000) return 'heat';
    if (t < T.split[0]) return 'plate';
    return 'cmp';
  }

  exitPoint() { return [RIGHT.cx, RIGHT.cy]; }

  controls() {
    return `<p class="group-label">Comparación</p>
      <button type="button" data-act="cmp" class="cta">Repetir comparación</button>
      <button type="button" data-act="zones" aria-pressed="true">Zonas del campo</button>
      <button type="button" data-act="zoom">Ver las moléculas</button>`;
  }
  bind(box, app) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'cmp') {
        if (this.t < T.split[0] + T.split[1]) this.t = T.split[0] + T.split[1];
        this.cmpStart = this.t;
        this.heat = null;
        this.paused = false;
        this.setFocus(null);
      } else if (act === 'zones') {
        this.showZones = !this.showZones;
      } else if (act === 'zoom') {
        if (this.focus) this.setFocus(null);
        else { this.focusDur = 2000; this.setFocus(CR); this.paused = false; }
      }
      app.wake();
    });
  }
  syncControls(box) {
    const z = box.querySelector('[data-act="zones"]');
    if (z) z.setAttribute('aria-pressed', String(this.showZones));
    const m = box.querySelector('[data-act="zoom"]');
    if (m) m.textContent = this.focus ? 'Volver a los platos' : 'Ver las moléculas';
  }
  clearFocus() { this.setFocus(null); }
  complete() { this.cmpStart = Math.min(this.cmpStart, T.cmp[0]); }
  busy() { return !!this.focus && !this.paused; }

  draw(R) {
    const t = R.t;
    this.molT = t;
    const deep = clamp((130 - R.vw / R.s) / 80);
    const out = 1 - deep;
    const split = E.inOut(seg(t, ...T.split));
    if (out > 0.01) {
      R.seq(this.guides, seg(t, ...T.guides), { a: 0.8 * out * (1 - split) }, 0.4);
      if (split < 1) this.drawMain(R, t, out * (1 - split));
      if (split > 0) this.drawCompare(R, t, split * out);
    }
    // Mundo molecular dentro del pedacito.
    if (R.vw / R.s < 500 || (t > T.dive[0] && t < T.back[0] + 1800)) {
      R.erase(rectPts(CR.x, CR.y, CR.w, CR.h), clamp((520 - R.vw / R.s) / 200));
      R.nest(CR, 1600, 1000, () => this.drawMolecules(R, t), { clip: true });
    }
  }

  drawMain(R, t, a) {
    // Zonas del campo bajo el plato (al volver).
    const z = seg(t, ...T.zones);
    if (z > 0) this.drawZones(R, MAIN, z * a, 0);
    R.seq(this.mainPlate, E.draw(seg(t, ...T.plate)), { a }, 0.35);
    R.seq(this.mainPlateHatch, seg(t, T.plate[0] + 600, 900), { a }, 0.6);
    R.erase(this.foodSil, clamp(seg(t, ...T.food) * 1.5) * a);
    R.seq(this.food, E.draw(seg(t, ...T.food)), { a }, 0.3);
    R.seq(this.foodBase, E.draw(seg(t, T.food[0] + 500, 800)), { a }, 0.3);
    R.seq(this.foodHatch, seg(t, T.food[0] + 800, 1100), { a }, 0.6);
    // Calor donde el campo es fuerte.
    const w = seg(t, ...T.warm);
    if (w > 0) this.drawWarmMain(R, w * a);
    R.label(MAIN.cx - MAIN.rx * 0.55, MAIN.cy - 40, 'comida (tiene agua)', seg(t, 3300, 700) * (1 - seg(t, T.cube[0], 500)), { dx: -60, dy: -110 });
    R.label(MAIN.cx + MAIN.rx * 0.98, MAIN.cy + 20, 'plato giratorio', seg(t, 2500, 700) * (1 - seg(t, T.cube[0], 500)), { dx: 50, dy: 70 });
    const pc = seg(t, ...T.cube);
    if (pc > 0) {
      R.seq(this.cube, E.draw(pc), { a }, 0.3);
      R.label(CR.x + CR.w, CR.y, 'un pedacito', pc * (1 - seg(t, T.dive[0] + 400, 300)), { dx: 70, dy: -70 });
    }
    if (z > 0) {
      R.label(MAIN.cx + MAIN.rx * 0.5, MAIN.cy + MAIN.ry * 0.6, 'zonas de campo fuerte (rayado)', clamp(z * 2 - 1) * a, { dx: 90, dy: 100 });
      R.label(MAIN.cx - MAIN.rx * 0.2, MAIN.cy - 50, 'absorbe más energía', seg(t, T.warm[0] + 500, 700) * a, { dx: -150, dy: -150, ink: 'w' });
    }
  }

  // Rayado del patrón del campo bajo un plato (coordenadas locales rotadas θ para el plato que gira: el patrón NO gira).
  drawZones(R, P, a, _th) {
    if (a <= 0) return;
    const key = `z${P.cx}`;
    if (!this[key]) {
      const list = [];
      const rows = 26;
      for (let k = 0; k < rows; k++) {
        const y = -1 + (2 * (k + 0.5)) / rows;
        let run = [];
        const flush = () => { if (run.length > 2) list.push(S(run, { w: 1.6, d: 0.6, strands: 2, wob: 0.4, taper: 5 })); run = []; };
        for (let i = 0; i <= 90; i++) {
          const x = -1.15 + (2.3 * i) / 90;
          const inside = x * x + y * y < 1.25;
          if (inside && fieldI(...this.floorOf(P, x, y)) > 0.45) run.push([P.cx + x * P.rx, P.cy + y * P.ry]);
          else flush();
        }
        flush();
      }
      this[key] = list;
    }
    R.seq(this[key], a, { a: Math.min(1, a) * 0.55 }, 0.85);
  }

  drawWarmMain(R, a) {
    // Marcas cálidas sobre la comida, más densas donde el campo es fuerte (sin temperaturas).
    const g = R.g;
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < 14; i++) {
      const rr = ((i + 0.5) / 14) * FOOD_R;
      for (let j = 0; j < 44; j++) {
        const ang = ((j + 0.5) / 44) * TAU;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        const f = fieldI(...this.floorOf(MAIN, x, y));
        const lev = Math.min(3, Math.floor(f * 4));
        if (lev < 1) continue;
        const px = MAIN.cx + x * MAIN.rx, py = MAIN.cy + y * MAIN.ry - 26 + (1 - rr / FOOD_R) * -10;
        const l = 7 + hash(i * 50 + j, 3) * 6, d = ang + Math.PI / 2 + (hash(j, i) - 0.5);
        paths[lev].moveTo(px - Math.cos(d) * l, py - Math.sin(d) * l * 0.5);
        paths[lev].lineTo(px + Math.cos(d) * l, py + Math.sin(d) * l * 0.5);
      }
    }
    g.strokeStyle = INK.w;
    g.lineCap = 'round';
    for (let lev = 1; lev < 4; lev++) {
      g.globalAlpha = a * (0.22 + lev * 0.2);
      g.lineWidth = (1 + lev * 0.5) * R.k;
      g.stroke(paths[lev]);
    }
    g.globalAlpha = 1;
  }

  drawCompare(R, t, a) {
    // El plato se desdobla: una copia queda quieta, la otra gira.
    const cmpLocal = t - this.cmpStart;
    this.ensureHeat(t);
    let max = 1e-6;
    for (const arr of [this.heat.still, this.heat.turn]) for (const v of arr) if (v > max) max = v;
    const th = cmpLocal > 0 ? ((clamp(cmpLocal, 0, T.cmp[1]) / ROT_PERIOD) * TAU) : 0;
    [[LEFT, this.heat.still, 0, 'plato quieto'], [RIGHT, this.heat.turn, th, 'plato girando']].forEach(([P, heat, rot, name], side) => {
      const from = MAIN;
      const u = a;
      const Q = { cx: lerp(from.cx, P.cx, u), cy: lerp(from.cy, P.cy, u), rx: lerp(from.rx, P.rx, u), ry: lerp(from.ry, P.ry, u) };
      if (this.showZones) this.drawZones(R, P, clamp(u * 2 - 1), 0);
      const plate = arc(Q.cx, Q.cy, Q.rx, Q.ry, 0, TAU, 72);
      R.sk(plate, 1, { seed: 5000 + side, w: 1.9, a: 1 });
      R.sk(arc(Q.cx, Q.cy + Q.ry * 0.14, Q.rx, Q.ry, 0.15, Math.PI - 0.15, 36), 1, { seed: 5010 + side, w: 1.2, d: 0.7 });
      // Comida: borde y una marca (una arveja) para ver el giro.
      const food = [];
      for (let i = 0; i <= 60; i++) {
        const ang = (i / 60) * TAU;
        const wob = 1 + 0.05 * noise(77, i / 6);
        food.push([Q.cx + Math.cos(ang + rot) * Q.rx * FOOD_R * wob, Q.cy + Math.sin(ang + rot) * Q.ry * FOOD_R * wob - 14]);
      }
      R.erase(food, 0.85);
      R.sk(food, 1, { seed: 5020 + side, w: 1.7 });
      const mk = [Q.cx + Math.cos(rot + 0.5) * Q.rx * 0.5, Q.cy + Math.sin(rot + 0.5) * Q.ry * 0.5 - 14];
      R.sk(arc(mk[0], mk[1], 9, 6, 0, TAU, 14), 1, { seed: 5030 + side, w: 1.5 });
      const rim = [Q.cx + Math.cos(rot - 0.4) * Q.rx * 0.95, Q.cy + Math.sin(rot - 0.4) * Q.ry * 0.95];
      R.sk([[rim[0] - 6, rim[1]], [rim[0] + 6, rim[1]]], 1, { seed: 5040 + side, w: 3 });
      // Energía absorbida acumulada (cálido), en coordenadas de la comida.
      if (u > 0.95) this.drawHeat(R, Q, heat, max, rot);
      R.label(Q.cx, Q.cy + Q.ry + 10, name, clamp(u * 2 - 1), { leader: false, dx: 0, dy: 50, align: 'center', size: 21 });
      if (side === 1 && cmpLocal > 0 && u > 0.9) {
        // Flecha de giro.
        const ar = arc(Q.cx, Q.cy, Q.rx + 26, Q.ry + 14, 0.3, 1.3, 20);
        R.sk(ar, 1, { seed: 5050, w: 1.4 });
        const e = ar[ar.length - 1];
        R.sk([[e[0] + 10, e[1] - 12], e, [e[0] + 14, e[1] + 4]], 1, { seed: 5051, w: 1.4 });
      }
    });
    if (a > 0.95) {
      const p = clamp(cmpLocal / 4000);
      R.text(110, 958, 'energía absorbida (cualitativa):', p, { size: 22, font: MONO_FONT, ink: 'b' });
      const g = R.g;
      g.strokeStyle = INK.w;
      for (let k = 0; k < 4; k++) {
        g.globalAlpha = (0.15 + k * 0.22) * p;
        g.lineWidth = (1 + k * 0.6) * R.k;
        g.beginPath();
        for (let m = 0; m < 4; m++) { g.moveTo(520 + k * 50 + m * 8, 958); g.lineTo(532 + k * 50 + m * 8, 944); }
        g.stroke();
      }
      g.globalAlpha = 1;
      R.text(470, 992, 'menos', p, { size: 22 });
      R.text(690, 992, 'más', p, { size: 22, ink: 'w' });
      R.text(900, 958, 'giro del plato: tiempo comprimido', p, { size: 20, font: MONO_FONT, ink: 'b', a: 0.7 });
      const fin = clamp((cmpLocal - 9000) / 1200);
      R.label(LEFT.cx + LEFT.rx * 0.4, LEFT.cy - LEFT.ry * 0.9, 'zonas muy calientes y frías que no cambian', fin, { dx: 30, dy: -150, size: 17 });
      R.label(RIGHT.cx + RIGHT.rx * 0.3, RIGHT.cy - RIGHT.ry * 0.9, 'más parejo, pero no perfecto', clamp(fin * 1.2 - 0.2), { dx: -30, dy: -150, size: 17 });
    }
  }

  drawHeat(R, Q, heat, max, rot) {
    const g = R.g;
    const paths = [null, new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < RINGS; i++) {
      const rr = ((i + 0.5) / RINGS) * FOOD_R;
      for (let j = 0; j < SECT; j++) {
        const v = heat[i * SECT + j] / max;
        const lev = Math.min(4, Math.floor(v * 5));
        if (lev < 1) continue;
        const ang = ((j + 0.5) / SECT) * TAU + rot;
        const px = Q.cx + Math.cos(ang) * rr * Q.rx, py = Q.cy + Math.sin(ang) * rr * Q.ry - 14;
        const d = ang + Math.PI / 2 + (hash(j, i) - 0.5) * 0.8;
        const l = 5 + lev * 1.5;
        for (let m = 0; m < Math.ceil(lev / 2); m++) {
          const ox = (hash(i * 31 + j, m) - 0.5) * 8, oy = (hash(j * 17 + i, m + 3) - 0.5) * 5;
          paths[lev].moveTo(px + ox - Math.cos(d) * l, py + oy - Math.sin(d) * l * 0.45);
          paths[lev].lineTo(px + ox + Math.cos(d) * l, py + oy + Math.sin(d) * l * 0.45);
        }
      }
    }
    g.strokeStyle = INK.w;
    g.lineCap = 'round';
    for (let lev = 1; lev <= 4; lev++) {
      g.globalAlpha = 0.15 + lev * 0.18;
      g.lineWidth = (0.9 + lev * 0.45) * R.k;
      g.stroke(paths[lev]);
    }
    g.globalAlpha = 1;
  }

  // ---------- Mundo molecular (1600×1000) ----------
  drawMolecules(R, t) {
    const lt = t - T.mol[0];
    const fieldOn = seg(t, ...T.fieldOn);
    // Tiempo didáctico: el campo cambia de sentido cada ~1,2 s (en realidad, ~4.900 millones de veces por segundo).
    const w = TAU / 2400;
    const ft = t - T.fieldOn[0];
    const Ex = fieldOn > 0 ? Math.cos(ft * w) : 0;
    const heat = seg(t, ...T.heat);
    const g = R.g;
    // Marco de la ampliación.
    R.sk(rectPts(30, 30, 1540, 940), E.draw(clamp(lt / 900)), { seed: 6000, w: 2 });
    R.text(60, 80, 'ampliación ×100.000.000 · esquema', clamp(lt / 1200), { size: 22, font: MONO_FONT, ink: 'b' });
    // Flecha del campo eléctrico (grosor ∝ intensidad, sentido según el signo).
    if (fieldOn > 0) {
      const y = 150, cx = 800, L = 330 * Ex;
      R.sk([[cx - L, y], [cx + L, y]], fieldOn, { seed: 6010, w: 2 + Math.abs(Ex) * 3 });
      if (Math.abs(Ex) > 0.15) {
        const s = Math.sign(Ex);
        R.sk([[cx + L - s * 34, y - 22], [cx + L, y], [cx + L - s * 34, y + 22]], fieldOn, { seed: 6011, w: 2.4 });
      }
      R.text(cx - 210, y - 34, 'campo eléctrico de la onda', fieldOn, { size: 26 });
      R.text(cx - 330, y + 64, 'tiempo didáctico: aquí cambia de sentido cada ~1 s', fieldOn, { size: 18, font: MONO_FONT, ink: 'b' });
    }
    // Moléculas: oxígeno (δ−) y dos hidrógenos (δ+).
    this.mols.forEach((m, i) => {
      const appear = E.draw(clamp((lt - 300 - i * 70) / 600));
      if (appear <= 0) return;
      // Respuesta al campo: giro hacia el sentido del campo, con retraso y sin completar.
      const resp = fieldOn > 0 ? Math.cos(ft * w - m.lag) : 0;
      const jit = heat * (noise(m.k + 50, t / 260) * 0.5);
      const base = m.a0 * (1 - 0.65 * fieldOn) + (resp > 0 ? 0 : Math.PI) * 0 ;
      const ang = base + fieldOn * m.amp * resp * 1.2 + jit;
      const jx = heat * noise(m.k + 90, t / 330) * 14, jy = heat * noise(m.k + 120, t / 290) * 14;
      const x = m.x + jx, y = m.y + 40 + jy;
      // Dipolo: del lado δ− (oxígeno) al δ+ (hidrógenos). Ángulo 0 → δ+ hacia la derecha.
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const hx = x + dx * 54, hy = y + dy * 54;
      const ha = 0.62;
      const h1 = [hx + Math.cos(ang + Math.PI / 2) * 30 * ha, hy + Math.sin(ang + Math.PI / 2) * 30 * ha];
      const h2 = [hx - Math.cos(ang + Math.PI / 2) * 30 * ha, hy - Math.sin(ang + Math.PI / 2) * 30 * ha];
      R.sk(arc(x, y, 34, 34, ang, ang + TAU, 26), appear, { seed: 6100 + i, w: 2 });
      R.sk([[x + dx * 30 + (h1[0] - x) * 0.05, y + dy * 30], h1], appear, { seed: 6200 + i, w: 1.6 });
      R.sk([[x + dx * 30, y + dy * 30], h2], appear, { seed: 6300 + i, w: 1.6 });
      R.sk(arc(h1[0], h1[1], 16, 16, 0, TAU, 16), appear, { seed: 6400 + i, w: 1.5 });
      R.sk(arc(h2[0], h2[1], 16, 16, 0, TAU, 16), appear, { seed: 6500 + i, w: 1.5 });
      if (i < 3 || this.lab) {
        R.text(x - 52 - dx * 30, y + 8 - dy * 30, 'δ−', appear * clamp((lt - 2000) / 600), { size: 22, ink: 'b' });
        R.text(hx + dx * 26 - 10, hy + dy * 26 + 8, 'δ+', appear * clamp((lt - 2200) / 600), { size: 22, ink: 'b' });
      }
      // Calor: ondulaciones cálidas alrededor de las moléculas agitadas.
      if (heat > 0) {
        const n = Math.round(heat * 3 * (0.6 + 0.4 * hash(i, 9)));
        for (let k = 0; k < n; k++) {
          const a0 = hash(i, k) * TAU + t / 2000;
          const r0 = 58 + k * 10;
          const pts = [];
          for (let q = 0; q <= 10; q++) {
            const aa = a0 + q * 0.09;
            const rr = r0 + Math.sin(q * 1.6 + t / 180) * 4;
            pts.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]);
          }
          R.sk(pts, 1, { seed: 6600 + i * 7 + k, w: 1.6, ink: 'w', a: 0.75 * heat });
        }
      }
    });
    if (fieldOn > 0) {
      R.label(this.mols[7].x + 30, this.mols[7].y + 40, 'gira hacia un lado, luego hacia el otro', clamp((t - T.fieldOn[0] - 800) / 700), { dx: 120, dy: -40, size: 20 });
    }
    if (heat > 0) {
      R.label(this.mols[16].x, this.mols[16].y + 80, 'roces y choques = calor', clamp((t - T.heat[0] - 600) / 700), { dx: -60, dy: 90, size: 20, ink: 'w' });
      // Barra cualitativa de energía absorbida.
      const bx = 1180, by = 900;
      R.text(bx - 10, by - 18, 'energía absorbida → calor', heat, { size: 18, font: MONO_FONT, ink: 'w' });
      R.sk(rectPts(bx, by, 330, 26), heat, { seed: 6900, w: 1.4 });
      const fill = clamp((t - T.heat[0]) / 9000);
      g.save();
      g.beginPath();
      g.rect(bx, by, 330 * fill, 26);
      g.clip();
      R.sk([[bx, by + 13], [bx + 330, by + 13]], 1, { seed: 6901, w: 18, ink: 'w', a: 0.35 });
      g.restore();
    }
  }
}
export { K as FOOD_K, T as FOOD_T };
