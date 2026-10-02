// 02 / DE ELECTRICIDAD A MICROONDAS — bloques grandes, detalle al explorar y corte del magnetrón.
import { E, seg, clamp, lerp, rect, pad, TAU, hash } from '../core.js';
import { S, arc, spline, hatch, hatchQuad, rectPts, MONO_FONT, INK } from '../pencil.js';
import { Scene } from '../scene.js';

const Y0 = 410, Y1 = 470; // conductores de ida y vuelta
const B = {
  plug: rect(40, 330, 170, 220),
  control: rect(270, 330, 180, 220),
  transformer: rect(510, 300, 230, 280),
  doubler: rect(800, 300, 230, 280),
  magnetron: rect(1090, 290, 230, 300),
  rf: rect(1330, 300, 250, 280),
};
const ORDER = ['plug', 'control', 'transformer', 'doubler', 'magnetron', 'rf'];
const NAMES = {
  plug: 'enchufe', control: 'control', transformer: 'transformador', doubler: 'condensador + diodo', magnetron: 'magnetrón', rf: 'guía → cavidad', inverter: 'fuente inverter',
};
// Corte del magnetrón: un mundo de 1000×1000 dentro de este círculo.
const CUT = rect(1155, 375, 100, 100);
const CUTC = [500, 500];

const T = {
  guides: [0, 800],
  blocks: [800, 6000], // 6 bloques × 1000
  flow: [7000, 4200],
  border: [9800, 1200],
  rfWave: [10400, 1600],
  demo: [12000, 4000],
};
const blockStart = (i) => T.blocks[0] + i * 950;

const OVERVIEW = rect(10, 160, 1590, 600);

export class PowerScene extends Scene {
  constructor() {
    super();
    this.num = '02';
    this.short = 'Energía';
    this.kicker = 'De electricidad a microondas';
    this.title = 'Del enchufe a la antena';
    this.alt = 'Diagrama de bloques: enchufe, control, transformador, condensador y diodo, magnetrón y guía de ondas. Un corte conceptual del magnetrón muestra cátodo, ánodo con cavidades resonantes y nube de electrones.';
    this.scope = 'Diagrama de bloques funcional, no un plano de cableado. Arquitectura convencional (transformador + condensador + diodo). Velocidades didácticas.';
    this.dur = 16000;
    this.phases = [0, 800, 7000, 12000];
    this.loop = true;
    this.sel = null;
    this.selT = 0;
    this.arch = 'conv';
    this.focusDur = 1300;
    this.notes = {
      intro: '<p>Seguí la energía de izquierda a derecha: entra por el enchufe como electricidad y sale del magnetrón convertida en microondas.</p>',
      flow: '<p>La electricidad del enchufe es <strong>alterna</strong>: empuja hacia un lado y hacia el otro, 50 veces por segundo. El transformador sube su <strong>tensión</strong>; el condensador y el diodo la convierten en pulsos de varios miles de voltios, siempre en el mismo sentido.</p>',
      border: '<p>Hasta el magnetrón, la energía viaja por cables como <strong>corriente eléctrica</strong>. Desde su antena viaja como <strong>onda de radiofrecuencia</strong> dentro de un tubo de metal. Los electrones no salen del magnetrón.</p>',
      rest: '<p>Tocá un bloque para ver qué hay adentro. El magnetrón se abre en un corte.</p>',
      plug: '<p><strong>Enchufe:</strong> entrega corriente alterna. En Argentina, 220 V que cambian de sentido 50 veces por segundo (en otros países, 120 V y 60 veces).</p>',
      control: '<p><strong>Control:</strong> el temporizador y un relé deciden cuándo pasa la corriente. En serie están los <strong>enclavamientos</strong> de la puerta: si la puerta se abre, el circuito se corta.</p>',
      transformer: '<p><strong>Transformador:</strong> dos bobinas sobre un núcleo de hierro. La de pocas vueltas recibe 220 V; la de muchas vueltas entrega unos miles de voltios. Un tercer devanado de pocas vueltas calienta el filamento del magnetrón.</p>',
      doubler: '<p><strong>Condensador y diodo:</strong> en medio ciclo, el diodo deja cargar el condensador. En el otro medio ciclo, esa carga se suma a la del transformador: el magnetrón recibe pulsos de casi el doble de tensión. Es un <em>duplicador de media onda</em>.</p>',
      magnetron: '<p><strong>Corte del magnetrón:</strong> el cátodo caliente suelta electrones. La tensión los empuja hacia el ánodo y el imán los curva: forman rayos que giran. Al pasar frente a las cavidades, las hacen «sonar», como el aire que sopla sobre una botella. Esa oscilación sale por la antena.</p>',
      rf: '<p><strong>Guía de ondas:</strong> un tubo rectangular de metal. La onda rebota en sus paredes y avanza hasta la cavidad. Ya no hay corriente en cables: es un campo que oscila.</p>',
      inverter: '<p><strong>Inverter:</strong> en lugar del transformador pesado, una fuente electrónica de alta frecuencia produce la alta tensión. Puede bajar la potencia de forma continua; el convencional, en cambio, enciende y apaga el magnetrón por ciclos de varios segundos.</p>',
    };
    this.defs = [
      ['Tensión', 'el «empuje» que mueve la electricidad. Se mide en voltios (V).'],
      ['Corriente', 'el flujo de carga eléctrica por un conductor.'],
      ['Diodo', 'deja pasar la corriente en un solo sentido, como una válvula.'],
      ['Radiofrecuencia (RF)', 'onda electromagnética que oscila muy rápido y viaja sin cables. Las microondas son RF de 2,45 GHz.'],
    ];
  }

  resetState() { this.sel = null; this.selT = 0; this.arch = 'conv'; }
  sim(dt) { this.selT += dt; this.archT = (this.archT ?? 1e9) + dt; }
  busy() { return !!this.sel && !this.paused; }

  build() {
    const box = (r, seed) => {
      const k = 10;
      const pts = [[r.x + k, r.y], [r.x + r.w - k, r.y + 1], [r.x + r.w, r.y + k], [r.x + r.w - 1, r.y + r.h - k], [r.x + r.w - k, r.y + r.h], [r.x + k, r.y + r.h - 1], [r.x, r.y + r.h - k], [r.x + 1, r.y + k], [r.x + k, r.y]];
      return S(spline(pts, 4), { w: 1.9, over: 3, seed });
    };
    this.boxes = {};
    for (const id of ORDER) this.boxes[id] = box(B[id]);
    this.invBox = box(rect(B.transformer.x, B.transformer.y, B.doubler.x + B.doubler.w - B.transformer.x, B.transformer.h));

    this.guides = [
      S([[20, 640], [1590, 640]], { ink: 'b', w: 0.9, d: 0.45, over: 0 }),
      S([[20, (Y0 + Y1) / 2], [1590, (Y0 + Y1) / 2]], { ink: 'b', w: 0.8, d: 0.25, dash: [4, 8] }),
    ];

    // Conductores entre bloques (ida y vuelta).
    this.wires = [];
    for (let i = 0; i < 4; i++) {
      const a = B[ORDER[i]], b = B[ORDER[i + 1]];
      this.wires.push([S([[a.x + a.w, Y0], [b.x, Y0]], { w: 1.4 }), S([[a.x + a.w, Y1], [b.x, Y1]], { w: 1.4 })]);
    }
    // Iconos de los bloques.
    const ic = {};
    const pl = B.plug;
    ic.plug = [
      S(rectPts(pl.x + 50, pl.y + 60, 70, 80), { w: 1.6 }),
      S([[pl.x + 66, pl.y + 60], [pl.x + 66, pl.y + 30]], { w: 2.2 }),
      S([[pl.x + 104, pl.y + 60], [pl.x + 104, pl.y + 30]], { w: 2.2 }),
      S(spline([[pl.x + 85, pl.y + 140], [pl.x + 90, pl.y + 165], [pl.x + 150, pl.y + 140], [pl.x + 170, pl.y + 80]], 8), { w: 1.4 }),
    ];
    const ct = B.control;
    ic.control = [
      S(arc(ct.x + 90, ct.y + 75, 38, 38, 0, TAU), { w: 1.5 }),
      S([[ct.x + 90, ct.y + 75], [ct.x + 90, ct.y + 50]], { w: 1.3 }),
      S([[ct.x + 90, ct.y + 75], [ct.x + 108, ct.y + 83]], { w: 1.3 }),
      S([[ct.x + 40, ct.y + 160], [ct.x + 80, ct.y + 160]], { w: 1.5 }),
      S([[ct.x + 100, ct.y + 160], [ct.x + 140, ct.y + 160]], { w: 1.5 }),
    ];
    const tr = B.transformer;
    ic.transformer = [
      S(rectPts(tr.x + 40, tr.y + 50, 150, 180), { w: 1.8 }),
      S(rectPts(tr.x + 75, tr.y + 85, 80, 110), { w: 1.4 }),
      ...coil(tr.x + 40, tr.y + 95, 90, 5, 22, -1),
      ...coil(tr.x + 190, tr.y + 70, 140, 14, 22, 1),
    ];
    ic.transformerHatch = hatchQuad([tr.x + 40, tr.y + 50], [tr.x + 190, tr.y + 50], [tr.x + 190, tr.y + 85], [tr.x + 40, tr.y + 85], 16, { d: 0.3 });
    const db = B.doubler;
    const cx = db.x + 70, dx = db.x + 160;
    ic.doubler = [
      S([[cx - 30, db.y + 130], [cx + 30, db.y + 130]], { w: 2.4 }),
      S([[cx - 30, db.y + 148], [cx + 30, db.y + 148]], { w: 2.4 }),
      S([[cx, db.y + 60], [cx, db.y + 130]], { w: 1.3 }),
      S([[cx, db.y + 148], [cx, db.y + 220]], { w: 1.3 }),
      S([[dx - 24, db.y + 120], [dx + 24, db.y + 120], [dx, db.y + 160], [dx - 24, db.y + 120]], { w: 1.6 }),
      S([[dx - 24, db.y + 162], [dx + 24, db.y + 162]], { w: 2.4 }),
      S([[dx, db.y + 60], [dx, db.y + 120]], { w: 1.3 }),
      S([[dx, db.y + 162], [dx, db.y + 220]], { w: 1.3 }),
    ];
    const mg = B.magnetron;
    ic.magnetron = [
      S(arc(CUT.x + 50, CUT.y + 50, 62, 62, 0, TAU), { w: 2 }),
      S(arc(CUT.x + 50, CUT.y + 50, 52, 52, 0, TAU), { w: 0.9, d: 0.5 }),
      S(rectPts(mg.x + 55, mg.y + 22, 120, 24), { w: 1.4 }),
      S(rectPts(mg.x + 55, mg.y + 214, 120, 24), { w: 1.4 }),
      S([[mg.x + 115, mg.y + 22], [mg.x + 115, mg.y - 20]], { w: 1.8 }),
    ];
    ic.magnetronHatch = [
      ...hatchQuad([mg.x + 55, mg.y + 22], [mg.x + 55, mg.y + 46], [mg.x + 175, mg.y + 46], [mg.x + 175, mg.y + 22], 12, { d: 0.35 }),
      ...hatchQuad([mg.x + 55, mg.y + 214], [mg.x + 55, mg.y + 238], [mg.x + 175, mg.y + 238], [mg.x + 175, mg.y + 214], 12, { d: 0.35 }),
    ];
    const rf = B.rf;
    ic.rf = [
      S([[mg.x + 115, mg.y - 20], [mg.x + 115, mg.y - 60], [rf.x + 30, mg.y - 60]], { w: 1.5 }),
      S([[mg.x + 140, mg.y - 20], [mg.x + 140, mg.y - 30], [rf.x + 30, mg.y - 30]], { w: 1.5 }),
      S(rectPts(rf.x + 30, rf.y + 40, 80, 200), { w: 1.6 }),
      S(rectPts(rf.x + 110, rf.y + 20, 120, 240), { w: 2 }),
    ];
    this.ic = ic;
    // Frontera entre circuito eléctrico y recorrido de RF.
    this.border = S([[mg.x + 128, 140], [mg.x + 128, 700]], { ink: 'b', w: 1.2, d: 0.7, dash: [10, 7] });

    // Inverter: placa con componentes y un transformador pequeño de ferrita.
    const iv = rect(B.transformer.x, B.transformer.y, B.doubler.x + B.doubler.w - B.transformer.x, B.transformer.h);
    this.inv = [
      S(rectPts(iv.x + 60, iv.y + 70, iv.w - 120, iv.h - 140), { w: 1.6 }),
      S(rectPts(iv.x + 110, iv.y + 105, 70, 50), { w: 1.4 }),
      S(rectPts(iv.x + 230, iv.y + 100, 60, 60), { w: 1.4 }),
      ...coil(iv.x + 330, iv.y + 100, 70, 6, 18, 1),
      S(rectPts(iv.x + 330, iv.y + 96, 70, 78), { w: 1.2 }),
      S([[iv.x + 100, iv.y + 190], [iv.x + 420, iv.y + 190]], { w: 1 }),
    ];

    // Detalles al explorar: se construyen aquí y se revelan con el reloj de selección.
    this.buildDetails();
    this.buildCut();
  }

  buildDetails() {
    const d = {};
    const pl = B.plug;
    // Onda alterna sobre el enchufe.
    const sine = [];
    for (let i = 0; i <= 60; i++) sine.push([pl.x + 20 + i * 2.2, pl.y + 190 + Math.sin((i / 60) * TAU * 2) * 14]);
    d.plug = [S(sine, { w: 1.3 }), S([[pl.x + 20, pl.y + 190], [pl.x + 154, pl.y + 190]], { ink: 'b', w: 0.8, d: 0.5 })];
    const ct = B.control;
    d.control = [
      S([[ct.x + 30, ct.y + 205], [ct.x + 70, ct.y + 205]], { w: 1.3 }),
      S([[ct.x + 70, ct.y + 205], [ct.x + 104, ct.y + 192]], { w: 1.6 }),
      S([[ct.x + 110, ct.y + 205], [ct.x + 150, ct.y + 205]], { w: 1.3 }),
    ];
    const tr = B.transformer;
    d.transformer = [...coil(tr.x + 190, tr.y + 210, 30, 3, 14, 1), S([[tr.x + 204, tr.y + 210], [tr.x + 228, tr.y + 210]], { w: 1 })];
    d.doubler = [];
    const db = B.doubler;
    d.doubler.push(S([[db.x + 10, db.y + 60], [db.x + 220, db.y + 60]], { w: 1.1 }), S([[db.x + 10, db.y + 220], [db.x + 220, db.y + 220]], { w: 1.1 }));
    this.det = d;
  }

  buildCut() {
    // Mundo del corte: centro (500,500).
    const [cx, cy] = CUTC;
    const N = 8, Rb = 170, Rc = 290, rc = 58, sw = 26, Ro = 430;
    this.cutN = N;
    const outer = S(arc(cx, cy, Ro, Ro, 0, TAU, 90), { w: 3, over: 0 });
    const outer2 = S(arc(cx, cy, Ro + 14, Ro + 14, 0.2, TAU + 0.2, 90), { w: 1.2, d: 0.5, over: 0 });
    // Contorno del ánodo: tramos del agujero central, ranuras y cavidades.
    const contour = [];
    const half = Math.asin(sw / 2 / Rb);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const a1 = a + half, a2 = a + TAU / N - half;
      contour.push(S(arc(cx, cy, Rb, Rb, a1, a2, 14), { w: 2.2, over: 0 }));
      // ranura i
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      const rr = Math.sqrt(Rc * Rc) - rc;
      for (const s of [-1, 1]) contour.push(S([[cx + ca * Rb * Math.cos(half) + nx * s * sw / 2, cy + sa * Rb * Math.cos(half) + ny * s * sw / 2], [cx + ca * (rr + 4) + nx * s * sw / 2, cy + sa * (rr + 4) + ny * s * sw / 2]], { w: 2, over: 0 }));
      const hx = cx + ca * Rc, hy = cy + sa * Rc;
      const gap = Math.asin(sw / 2 / rc);
      contour.push(S(arc(hx, hy, rc, rc, a + Math.PI + gap, a + Math.PI + TAU - gap, 30), { w: 2.2, over: 0 }));
    }
    this.cutOutline = [outer, outer2, ...contour];
    // Rayado del cobre: diagonal, recortado al ánodo (anillo menos agujeros).
    this.cutHatch = hatch(56, (u) => {
      const k = lerp(-Ro, Ro, u);
      return [[cx + k - Ro, cy - Ro], [cx + k + Ro, cy + Ro]];
    }, { d: 0.32, w: 1.1, trim: 0, h: 7 });
    this.cutClip = (g) => {
      g.beginPath();
      g.arc(cx, cy, Ro, 0, TAU);
      g.moveTo(cx + Rb, cy);
      g.arc(cx, cy, Rb, 0, TAU);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const hx = cx + Math.cos(a) * Rc, hy = cy + Math.sin(a) * Rc;
        g.moveTo(hx + rc, hy);
        g.arc(hx, hy, rc, 0, TAU);
        // ranura como polígono
        const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
        g.moveTo(cx + ca * (Rb - 5) + nx * sw / 2, cy + sa * (Rb - 5) + ny * sw / 2);
        g.lineTo(cx + ca * Rc + nx * sw / 2, cy + sa * Rc + ny * sw / 2);
        g.lineTo(cx + ca * Rc - nx * sw / 2, cy + sa * Rc - ny * sw / 2);
        g.lineTo(cx + ca * (Rb - 5) - nx * sw / 2, cy + sa * (Rb - 5) - ny * sw / 2);
        g.closePath();
      }
      g.clip('evenodd');
    };
    // Cátodo con filamento en espiral.
    const fil = [];
    for (let i = 0; i <= 80; i++) {
      const u = i / 80;
      fil.push([cx - 34 + u * 68, cy + Math.sin(u * TAU * 5) * 18]);
    }
    this.cathode = [S(arc(cx, cy, 42, 42, 0, TAU, 40), { w: 2 }), S(fil, { w: 1.1, d: 0.7, h: 1.6 })];
    // Antena: sale de una paleta hacia arriba.
    const aa = -Math.PI / 2 + TAU / N / 2;
    this.antenna = [
      S([[cx + Math.cos(aa - 0.05) * (Rb + 30), cy + Math.sin(aa - 0.05) * (Rb + 30)], [cx + 40, cy - Ro + 30], [cx + 40, cy - Ro - 120]], { w: 2.6 }),
      S([[cx + 26, cy - Ro - 120], [cx + 54, cy - Ro - 120], [cx + 54, cy - Ro - 200], [cx + 26, cy - Ro - 200], [cx + 26, cy - Ro - 120]], { w: 1.8 }),
    ];
    this.cutGeo = { N, Rb, Rc, rc, Ro, sw };
  }

  noteKey(t) {
    if (this.sel) return this.sel === 'transformer' && this.arch === 'inv' ? 'inverter' : this.sel;
    if (this.arch === 'inv' && t >= this.dur) return 'inverter';
    if (t < T.flow[0]) return 'intro';
    if (t < T.border[0]) return 'flow';
    if (t < this.dur) return 'border';
    return 'rest';
  }

  camera(t) {
    const u = E.inOut(seg(t, 0, 7000));
    const start = rect(-40, 180, 900, 560);
    // Durante el trazado, la cámara acompaña al bloque que se dibuja.
    const lead = clamp((t - T.blocks[0]) / 5700);
    const x = lerp(start.x, OVERVIEW.x, u) + Math.sin(lead * Math.PI) * 30 * (1 - u);
    return { x, y: lerp(start.y, OVERVIEW.y, u), w: lerp(start.w, OVERVIEW.w, u), h: lerp(start.h, OVERVIEW.h, u) };
  }

  exitPoint() { return [B.rf.x + 170, B.rf.y + 140]; }

  pick(id) {
    if (!id || id === this.sel) { this.sel = null; this.setFocus(null); return; }
    this.sel = id;
    this.selT = 0;
    this.paused = false;
    if (this.t < this.dur) this.t = this.dur;
    if (id === 'magnetron') {
      this.focusDur = 2100;
      this.setFocus(pad(CUT, 8, 6));
    } else {
      this.focusDur = 1300;
      const r = id === 'transformer' && this.arch === 'inv' ? rect(B.transformer.x, B.transformer.y, B.doubler.x + B.doubler.w - B.transformer.x, B.transformer.h) : B[id];
      this.setFocus(pad(r, 70, 60));
    }
  }
  clearFocus() { this.sel = null; this.setFocus(null); }
  onPick(id) { this.pick(ORDER.includes(id) ? id : null); }

  controls() {
    const b = ORDER.map((id, i) => `<button type="button" data-blk="${id}" aria-pressed="false"><span class="n">${i + 1}</span>${NAMES[id]}${id === 'magnetron' ? ' (corte)' : ''}</button>`).join('');
    return `<p class="group-label">Explorar un bloque</p>${b}<p class="group-label">Arquitectura</p><div class="seg" role="group" aria-label="Arquitectura de la fuente"><button type="button" data-arch="conv" aria-pressed="true">Convencional</button><button type="button" data-arch="inv" aria-pressed="false">Inverter</button></div>`;
  }
  bind(box, app) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-blk]');
      if (b) { this.pick(b.dataset.blk); app.wake(); return; }
      const a = e.target.closest('[data-arch]');
      if (a) {
        this.arch = a.dataset.arch;
        this.archT = 0;
        this.paused = false;
        if (this.t < this.dur) this.t = this.dur;
        if (this.sel === 'doubler' && this.arch === 'inv') this.pick('transformer');
        app.wake();
      }
    });
  }
  syncControls(box) {
    box.querySelectorAll('[data-blk]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.blk === this.sel));
      if (b.dataset.blk === 'doubler') b.disabled = this.arch === 'inv';
      if (b.dataset.blk === 'transformer') b.lastChild.textContent = this.arch === 'inv' ? NAMES.inverter : NAMES.transformer;
    });
    box.querySelectorAll('[data-arch]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arch === this.arch)));
  }

  draw(R) {
    const t = R.t;
    const sel = this.sel;
    // Al entrar en el corte, el diagrama de bloques se retira.
    const deep = clamp((420 - R.vw / R.s) / 260);
    const dim = (id) => (sel && sel !== id ? 0.2 : 1) * (1 - deep);
    const inv = this.arch === 'inv';

    R.seq(this.guides, seg(t, ...T.guides), { a: 0.8 * (1 - deep) }, 0.4);

    // Bloques: uno por vez, de izquierda a derecha. Los demás esperan.
    ORDER.forEach((id, i) => {
      const s0 = blockStart(i);
      const pb = E.draw(seg(t, s0, 900));
      if (pb <= 0) return;
      const hidden = inv && (id === 'transformer' || id === 'doubler');
      const a = dim(id === 'doubler' && inv ? 'transformer' : id) * (hidden ? 0.12 : 1);
      R.st(this.boxes[id], pb, { a });
      const icon = this.ic[id];
      R.seq(icon, seg(t, s0 + 250, 800), { a }, 0.4);
      const ih = this.ic[id + 'Hatch'];
      if (ih) R.seq(ih, seg(t, s0 + 600, 600), { a }, 0.6);
      if (i < 4) R.seq(this.wires[i], seg(t, s0 + 700, 500), { a: Math.min(a, dim(id) + 0.2) }, 0.2);
      // El nombre llega después de reconocer la forma.
      const bx = B[id];
      if (!hidden && deep < 0.5) R.label(bx.x + bx.w / 2, 625, NAMES[id], seg(t, s0 + 900, 600), { leader: false, align: 'center', size: 18, a: sel && sel !== id ? 0.35 : 0.92 });
      R.hit(id === 'doubler' && inv ? 'transformer' : id, rectPts(bx.x, bx.y, bx.w, bx.h));
    });
    if (inv) {
      const iv = rect(B.transformer.x, B.transformer.y, B.doubler.x + B.doubler.w - B.transformer.x, B.transformer.h);
      const u = clamp(this.archT / 1200);
      R.erase(rectPts(iv.x + 4, iv.y + 4, iv.w - 8, iv.h - 8), 0.85);
      R.st(this.invBox, E.draw(u), { a: dim('transformer') });
      R.seq(this.inv, E.draw(clamp(this.archT / 1600 - 0.2)), { a: dim('transformer') }, 0.4);
      R.label(iv.x + iv.w / 2, 625, NAMES.inverter, clamp(this.archT / 900 - 0.6), { leader: false, align: 'center', size: 18 });
      this.drawPowerChart(R, u);
    }

    // Recorrido de la corriente: va y viene (alterna) y luego pulsa en un sentido.
    const fl = seg(t, T.flow[0], T.flow[1]);
    if (fl > 0 && deep < 0.6 && !this.powerOff) this.drawCurrent(R, t, fl);

    // Frontera: circuito eléctrico | radiofrecuencia.
    const pbd = E.draw(seg(t, ...T.border));
    if (pbd > 0 && deep < 0.6) {
      R.st(this.border, pbd, { a: 0.85 });
      R.label(B.magnetron.x + 128, 170, 'circuito eléctrico', clamp(pbd * 2 - 0.7), { leader: false, align: 'right', dx: -14, dy: 0, size: 16, ink: 'b' });
      R.label(B.magnetron.x + 128, 170, 'radiofrecuencia', clamp(pbd * 2 - 1), { leader: false, dx: 14, dy: 0, size: 16, ink: 'b' });
      R.text(B.magnetron.x + 110, 196, '← cables', clamp(pbd * 2 - 0.9), { size: 13, align: 'right', font: MONO_FONT, ink: 'b', a: 0.7 });
      R.text(B.magnetron.x + 146, 196, 'ondas en un tubo →', clamp(pbd * 2.2 - 1.1), { size: 13, font: MONO_FONT, ink: 'b', a: 0.7 });
    }
    const rw = seg(t, ...T.rfWave);
    if (rw > 0 && deep < 0.6 && !this.powerOff) this.drawRF(R, t, rw);

    // Detalles al explorar.
    if (sel && sel !== 'magnetron') this.drawDetail(R, sel);
    // Corte del magnetrón: otro dibujo dentro del círculo.
    const cutVis = sel === 'magnetron' ? 1 : 0;
    if (cutVis || R.vw / R.s < 520) {
      R.erase(arc(CUT.x + 50, CUT.y + 50, 51, 51, 0, TAU, 40), 1);
      R.nest(CUT, 1000, 1000, () => this.drawCut(R, sel === 'magnetron' ? this.selT : 99999), { clip: false });
    }
  }

  drawPowerChart(R, u) {
    // Potencia media: el convencional enciende y apaga; el inverter baja de forma continua.
    const x0 = 520, y0 = 690, w = 500;
    R.text(x0, y0 - 20, 'potencia al 50 %', u, { size: 15, font: MONO_FONT, ink: 'b' });
    const conv = [[x0, y0 + 40]];
    for (let k = 0; k < 4; k++) {
      const a = x0 + k * 125;
      conv.push([a, y0 + 40], [a, y0], [a + 62, y0], [a + 62, y0 + 40], [a + 125, y0 + 40]);
    }
    R.sk(conv, E.draw(clamp(u * 1.4 - 0.2)), { seed: 801, w: 1.3, a: 0.6 });
    R.text(x0 + w + 16, y0 + 24, 'convencional: 100 % / 0 %', u, { size: 14, a: 0.6 });
    R.sk([[x0, y0 + 90], [x0 + w, y0 + 90]], E.draw(clamp(u * 1.4 - 0.4)), { seed: 802, w: 1.6 });
    R.sk([[x0, y0 + 110], [x0 + w, y0 + 110]], E.draw(clamp(u * 1.4 - 0.4)), { seed: 803, w: 0.7, ink: 'b', a: 0.5 });
    R.text(x0 + w + 16, y0 + 96, 'inverter: 50 % continuo', u, { size: 14 });
  }

  drawCurrent(R, t, fl) {
    const g = R.g;
    // Avance de la iluminación: bloque por bloque.
    const reach = fl * 5;
    const tt = (t - T.flow[0]) / 1000;
    for (let i = 0; i < 4; i++) {
      const a = B[ORDER[i]], b = B[ORDER[i + 1]];
      const vis = clamp(reach - i);
      if (vis <= 0) continue;
      const x0 = a.x + a.w, x1 = lerp(x0, b.x, vis);
      const alt = i < 3; // antes del duplicador: alterna; después, pulsos
      const dimA = this.sel && this.sel !== ORDER[i] && this.sel !== ORDER[i + 1] ? 0.2 : 1;
      for (const [yy, dir] of [[Y0, 1], [Y1, -1]]) {
        for (let k = 0; k < 6; k++) {
          // Tiempos didácticos: el vaivén se ve a menos de un ciclo por segundo.
          let ph;
          if (alt) ph = (k / 6) + Math.sin(tt * 2.6) * 0.06 * dir;
          else ph = ((k / 6) + tt * 0.22 * dir + 10) % 1;
          ph = ((ph % 1) + 1) % 1;
          const x = lerp(x0, x0 + (b.x - x0), ph);
          if (x > x1) continue;
          const len = 14;
          R.sk([[x - len / 2, yy], [x + len / 2, yy]], 1, { seed: 900 + k, w: 3.2, d: 0.85, a: dimA * (alt ? 0.6 : 0.9) });
        }
      }
    }
    if (fl > 0.3) R.label((B.plug.x + B.plug.w + B.control.x) / 2, Y0 - 8, 'va y viene', clamp(fl * 3 - 0.9), { dx: -10, dy: -50, size: 16 });
    if (fl > 0.8) R.label((B.doubler.x + B.doubler.w + B.magnetron.x) / 2, Y1 + 8, 'pulsos en un sentido', clamp(fl * 5 - 4), { dx: -10, dy: -90, size: 16 });
  }

  drawRF(R, t, rw) {
    const mg = B.magnetron, rf = B.rf;
    // Campo dentro de la guía: curvas que crecen y cambian de signo, sin bolitas.
    const tt = (t - T.rfWave[0]) / 1000;
    const x0 = rf.x + 34, x1 = rf.x + 106;
    const y0 = rf.y + 44, y1 = rf.y + 236;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = lerp(y0 + 10, y1 - 10, i / (n - 1));
      const vis = clamp(rw * 1.6 - i / n);
      if (vis <= 0) continue;
      const amp = Math.sin((i / (n - 1)) * Math.PI * 2 - tt * 2.2) * 26;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        pts.push([lerp(x0, x1, u), y + Math.sin(u * Math.PI) * amp * 0.4]);
      }
      R.sk(pts, vis, { seed: 1000 + i, w: Math.abs(amp) / 16 + 0.4, d: 0.7 });
    }
    // Unión magnetrón → guía.
    R.label(rf.x + 70, rf.y + 200, 'campo que oscila', clamp(rw * 2 - 1), { dx: 40, dy: 100, size: 16 });
    R.label(rf.x + 170, rf.y + 60, 'cavidad', clamp(rw * 2 - 0.9), { dx: -10, dy: -70, size: 16 });
  }

  drawDetail(R, sel) {
    const u = clamp(this.selT / 1600);
    const pu = E.draw(clamp((this.selT - 500) / 1500));
    if (sel === 'plug') {
      R.seq(this.det.plug, pu, {}, 0.3);
      R.text(B.plug.x + 20, B.plug.y + 225, '220 V · 50 Hz', pu, { size: 13, font: MONO_FONT, ink: 'b' });
    } else if (sel === 'control') {
      R.seq(this.det.control, pu, {}, 0.3);
      R.text(B.control.x + 20, B.control.y + 125, 'temporizador', pu, { size: 12, font: MONO_FONT, ink: 'b' });
      R.text(B.control.x + 20, B.control.y + 188, 'enclavamientos de la puerta (cap. 05)', pu, { size: 10, font: MONO_FONT, ink: 'b' });
    } else if (sel === 'transformer') {
      if (this.arch === 'inv') {
        const iv = B.transformer;
        R.text(iv.x + 70, iv.y + 236, 'conmutación electrónica rápida · transformador de ferrita pequeño', pu, { size: 12, font: MONO_FONT, ink: 'b' });
        return;
      }
      const tr = B.transformer;
      R.seq(this.det.transformer, pu, {}, 0.3);
      R.text(tr.x + 8, tr.y + 40, 'primario: pocas vueltas', pu, { size: 12, font: MONO_FONT, ink: 'b' });
      R.text(tr.x + 120, tr.y + 64, 'alta tensión: muchas vueltas', clamp(pu * 1.3 - 0.2), { size: 12, font: MONO_FONT, ink: 'b' });
      R.text(tr.x + 128, tr.y + 250, 'filamento: pocos voltios', clamp(pu * 1.3 - 0.3), { size: 12, font: MONO_FONT, ink: 'b' });
    } else if (sel === 'doubler') {
      const db = B.doubler;
      R.seq(this.det.doubler, pu, {}, 0.3);
      // Carga del condensador: signos que aparecen y cambian con cada medio ciclo didáctico.
      const ph = Math.sin(this.selT / 700);
      const n = Math.round(clamp(Math.abs(ph)) * 4);
      for (let k = 0; k < n; k++) {
        R.text(db.x + 48 + k * 12, db.y + 122, ph > 0 ? '+' : '−', 1, { size: 14, ink: 'b' });
        R.text(db.x + 48 + k * 12, db.y + 168, ph > 0 ? '−' : '+', 1, { size: 14, ink: 'b' });
      }
      R.text(db.x + 12, db.y + 254, ph > 0 ? 'medio ciclo 1: carga' : 'medio ciclo 2: se suma', pu, { size: 12, font: MONO_FONT, ink: 'b' });
      R.text(db.x + 132, db.y + 104, 'deja pasar ↓', pu, { size: 12, font: MONO_FONT, ink: 'b' });
    } else if (sel === 'rf') {
      const rf = B.rf;
      R.text(rf.x + 10, rf.y + 270, 'tubo rectangular de metal', pu, { size: 12, font: MONO_FONT, ink: 'b' });
    }
    void u;
  }

  // Corte conceptual del magnetrón: s es el reloj desde que se abrió.
  drawCut(R, s) {
    const { N, Rb, Rc, rc, Ro } = this.cutGeo;
    const [cx, cy] = CUTC;
    const g = R.g;
    const P = (a, b) => E.draw(clamp((s - a) / b));
    // Contorno y cavidades.
    R.seq(this.cutOutline, P(900, 2200), {}, 0.25);
    g.save();
    this.cutClip(g);
    R.seq(this.cutHatch, P(2400, 1400), { a: 0.9 }, 0.7);
    g.restore();
    // Cátodo.
    R.seq(this.cathode, P(3000, 900), {}, 0.4);
    // Campo magnético perpendicular al dibujo: puntos encerrados.
    const pm = P(3600, 900);
    if (pm > 0) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.5, r = 110;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        R.sk(arc(x, y, 9, 9, 0, TAU, 14), clamp(pm * 1.5 - i * 0.08), { seed: 1200 + i, w: 1, ink: 'b' });
        if (pm > 0.5) R.glow(x, y, 3, 1, 'b');
        g.fillStyle = INK.b;
        g.globalAlpha = clamp(pm * 2 - 1);
        g.beginPath();
        g.arc(x, y, 2.4, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
      }
    }
    // Nube de electrones: rayos que giran (tiempo didáctico, millones de veces más lento).
    const pe = clamp((s - 4300) / 1800);
    const spin = (s - 4300) / 1000 * 0.45;
    if (pe > 0) {
      g.fillStyle = INK.g;
      const spokes = N / 2;
      for (let k = 0; k < spokes; k++) {
        for (let j = 0; j < 22; j++) {
          const life = ((j / 22) + (s / 2600)) % 1; // recorrido de cada electrón del cátodo al ánodo
          const r = lerp(48, Rb - 6, life);
          if (r > lerp(48, Rb, pe)) continue;
          const lean = (r - 48) / (Rb - 48);
          // Los electrones se curvan (imán) y se agrupan en rayos (cavidades).
          const ang = spin + (k / spokes) * TAU + lean * 0.9 + (hash(j, k) - 0.5) * (0.5 - lean * 0.28);
          const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          g.globalAlpha = 0.55 + 0.35 * lean;
          g.beginPath();
          g.arc(x, y, 3.6, 0, TAU);
          g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    // Oscilación en las cavidades: cargas que se alternan y campo en las bocas.
    const po = clamp((s - 5600) / 1400);
    if (po > 0) {
      const osc = Math.cos(((s - 5600) / 1000) * TAU * 0.55);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU + TAU / N / 2; // punta de la paleta i
        const sign = (i % 2 ? 1 : -1) * osc;
        const x = cx + Math.cos(a) * (Rb + 22), y = cy + Math.sin(a) * (Rb + 22);
        R.text(x - 7, y + 7, sign > 0 ? '+' : '−', po * clamp(Math.abs(sign) * 3), { size: 22, ink: 'b' });
        // Arcos de campo sobre la boca de la cavidad i.
        const am = (i / N) * TAU;
        const amp = sign * 34 * po;
        const pts = [];
        for (let k = 0; k <= 10; k++) {
          const v = (k / 10 - 0.5) * 0.36;
          const rr = Rb - 6 - Math.cos(v * 4.3) * Math.abs(amp) * 0.6;
          pts.push([cx + Math.cos(am + v) * rr, cy + Math.sin(am + v) * rr]);
        }
        R.sk(pts, 1, { seed: 1300 + i, w: 0.7 + Math.abs(amp) / 20, d: 0.7, ink: 'b', a: po });
        // La cavidad «suena»: anillos que respiran.
        const hx = cx + Math.cos(am) * Rc, hy = cy + Math.sin(am) * Rc;
        R.sk(arc(hx, hy, rc * (0.45 + 0.25 * Math.abs(osc)), rc * (0.45 + 0.25 * Math.abs(osc)), 0, TAU, 22), po, { seed: 1400 + i, w: 0.8, d: 0.45, ink: 'b' });
      }
    }
    // Antena y salida de la onda (ya no electrones).
    R.seq(this.antenna, P(6600, 1000), {}, 0.4);
    const pa = clamp((s - 7400) / 1500);
    if (pa > 0) {
      const tt = (s - 7400) / 1000;
      for (let k = 0; k < 4; k++) {
        const ph = ((tt * 0.35 + k / 4) % 1);
        const r = 40 + ph * 170;
        const ycen = cy - Ro - 200;
        R.sk(arc(cx + 40, ycen, r, r * 0.55, Math.PI * 1.15, Math.PI * 1.85, 24), pa, { seed: 1500 + k, w: 1.6 * (1 - ph) + 0.3, d: 0.75 * (1 - ph * 0.8) });
      }
    }
    // Etiquetas, una por vez y en orden de aparición.
    const lab = (txt, x, y, at, dx, dy) => R.label(x, y, txt, clamp((s - at) / 700), { dx, dy, size: 17 });
    lab('ánodo de cobre', cx + Math.cos(-2.4) * 380, cy + Math.sin(-2.4) * 380, 2600, -60, -40);
    lab('cavidad resonante', cx + Math.cos(0) * Rc, cy, 3200, 80, 40);
    lab('cátodo caliente: suelta electrones', cx, cy + 30, 3800, -40, 140);
    lab('imán: campo que sale del papel', cx + Math.cos(0.5) * 110, cy + Math.sin(0.5) * 110, 4400, 140, 120);
    lab('rayos de electrones que giran', cx + Math.cos(spin + 0.6) * 120, cy + Math.sin(spin + 0.6) * 120, 5600, -140, -140);
    lab('antena: sale la onda, no los electrones', cx + 54, cy - Ro - 150, 8200, 90, 40);
    R.text(cx - 300, cy + Ro + 70, 'corte conceptual · tiempo didáctico (real: 2.450 millones de ciclos por segundo)', P(4000, 1500), { size: 18, font: MONO_FONT, ink: 'b', a: 0.75 });
  }
}

// Bobina como espiras dibujadas a mano: devuelve trazos.
function coil(x, y, h, turns, w, side) {
  const out = [];
  const step = h / turns;
  for (let i = 0; i < turns; i++) {
    const yy = y + i * step;
    out.push(S(arc(x, yy + step / 2, w / 2, step / 2 + 1, -Math.PI / 2, Math.PI / 2, 10).map(([px, py]) => [x + (px - x) * side, py]), { w: 1.3, over: 0 }));
  }
  return out;
}
export { OVERVIEW as POWER_VIEW, T as POWER_T };
