// 01 / EL MAPA — el horno cerrado se abre en una vista explotada.
import { E, seg, clamp, lerp, travel, rect, pad, bboxOf, TAU } from '../core.js';
import { S, hatch, hatchQuad, arc, spline, MONO_FONT } from '../pencil.js';
import { Scene } from '../scene.js';
import { makeProj, box, circle3, cylinder } from './geo.js';

const OX = 470, OY = 760;
const P = makeProj(OX, OY);

// Desplazamientos de la vista explotada (en el plano del dibujo).
const LIFT = 320;
const OFF = {
  magnetron: [146, -40],
  fan: [214, -88],
  power: [150, 112],
  plate: [0, -130],
  motor: [0, 105],
};

const PARTS = [
  { id: 'cavity', n: 1, name: 'cavidad', dx: -70, dy: -150 },
  { id: 'plate', n: 2, name: 'plato giratorio', dx: -150, dy: 40 },
  { id: 'fan', n: 3, name: 'ventilador', dx: 60, dy: -60 },
  { id: 'magnetron', n: 4, name: 'magnetrón', dx: -40, dy: -110 },
  { id: 'power', n: 5, name: 'alimentación', dx: 90, dy: 40 },
];

const T = {
  guides: [0, 900],
  casing: [900, 1700],
  door: [2300, 1200],
  panel: [3100, 1000],
  base: [3700, 700],
  shade: [4200, 1000],
  dip: [5400, 300],
  lift: [5700, 2000],
  swing: [6700, 1500],
  cavity: [7600, 1400],
  plate: [8700, 800],
  motor: [9200, 600],
  guide: [9500, 700],
  magnetron: [9900, 1000],
  fan: [10700, 800],
  power: [11300, 1200],
  xMag: [12700, 1100],
  xFan: [13300, 1000],
  xPow: [13900, 1100],
  xPlate: [14500, 1100],
  tour: [15600, 5500],
};
const p = (k, t, e = E.lin) => e(seg(t, T[k][0], T[k][1]));

const CLOSED = rect(390, 280, 840, 540);
const OPEN = rect(200, -30, 1180, 940);

export class MapScene extends Scene {
  constructor() {
    super();
    this.num = '01';
    this.short = 'El mapa';
    this.kicker = 'El mapa';
    this.title = 'Qué hay dentro de la caja';
    this.alt = 'Un microondas dibujado a lápiz se abre en vista explotada: carcasa, puerta, cavidad, plato, ventilador, magnetrón y alimentación.';
    this.scope = 'Ilustración conceptual · disposición típica de un horno convencional; cada modelo varía.';
    this.dur = 21500;
    this.phases = [0, 900, 5400, 15600];
    this.sel = null;
    this.hov = null;
    this.focusDur = 1300;
    this.notes = {
      intro: '<p>Así se ve un microondas por fuera: una caja de chapa, una puerta con ventana y un panel de botones.</p>',
      lift: '<p>Levantemos la <strong>carcasa</strong>, la cubierta de chapa. Debajo hay pocas piezas, y cada una tiene un solo trabajo.</p>',
      parts: '<p>Separadas, se ve cómo se relacionan: la <strong>alimentación</strong> da electricidad al <strong>magnetrón</strong>, que fabrica microondas; la guía las lleva a la <strong>cavidad</strong>, donde está el <strong>plato</strong>. El <strong>ventilador</strong> enfría.</p>',
      rest: '<p>Tocá una pieza o su número para acercarla. Cada una hace una sola cosa.</p>',
      cavity: '<p><strong>Cavidad:</strong> la caja de metal donde va la comida. Sus paredes reflejan las microondas y las mantienen adentro.</p>',
      plate: '<p><strong>Plato giratorio:</strong> pasea la comida por lugares que calientan más y lugares que calientan menos, para repartir el calor.</p>',
      fan: '<p><strong>Ventilador:</strong> sopla aire sobre el magnetrón y el transformador para que no se recalienten. No calienta la comida.</p>',
      magnetron: '<p><strong>Magnetrón:</strong> la pieza que convierte electricidad de alta tensión en microondas. Es el corazón del horno.</p>',
      power: '<p><strong>Alimentación:</strong> transforma la electricidad del enchufe en la alta tensión que necesita el magnetrón. Transformador, condensador y diodo.</p>',
    };
    this.defs = [
      ['Microondas', 'ondas de radio de alta frecuencia: campos eléctricos y magnéticos que oscilan. No son calor ni partículas de comida.'],
      ['Vista explotada', 'dibujo con las piezas separadas a lo largo de líneas guía, para ver dónde va cada una.'],
    ];
  }

  resetState() { this.sel = null; }

  build() {
    // Guías azules de construcción.
    this.guides = [
      S([[300, OY + 2], [1330, OY - 2]], { ink: 'b', w: 1, d: 0.5, over: 0 }),
      S([P(0, 0, 0), P(0, 0, 560)], { ink: 'b', w: 0.9, d: 0.38, dash: [10, 7] }),
      S([P(520, 0, 0), P(520, 0, 560)], { ink: 'b', w: 0.9, d: 0.38, dash: [10, 7] }),
      S([P(0, 0, 0), P(0, 420, 0)], { ink: 'b', w: 0.9, d: 0.35 }),
      S([P(520, 0, 0), P(520, 420, 0)], { ink: 'b', w: 0.9, d: 0.35 }),
      S([P(-40, 310, 0), P(600, 310, 0)], { ink: 'b', w: 0.8, d: 0.3, dash: [4, 6] }),
    ];
    // Carcasa.
    const cb = box(P, 0, 0, 0, 520, 310, 400, { w: 1.9 });
    this.casing = cb.edges;
    this.casingSil = cb.sil;
    const f = cb.faces;
    this.casingHatch = [
      ...hatchQuad(f.right[0], f.right[1], f.right[2], f.right[3], 34, { dist: (u) => Math.pow(u, 1.35), d: 0.4 }),
      ...hatchQuad(f.top[3], f.top[2], f.top[1], f.top[0], 10, { dist: (u) => u * 0.45, d: 0.22 }),
    ];
    // Sombra proyectada en el piso: se aclara cuando la carcasa sube.
    const g0 = P(520, 0, 0), g1 = P(520, 0, 400), g2 = [g1[0] + 90, g1[1] + 8], g3 = [g0[0] + 70, g0[1] + 6];
    this.shadow = hatchQuad(g0, g1, g2, g3, 18, { d: 0.3, w: 0.8 });
    // Base y patas.
    this.base = [
      ...box(P, 6, -6, 2, 514, 0, 396, { w: 1.2, d: 0.6 }).edges.slice(0, 6),
      ...[[40, 20], [460, 20], [40, 360], [460, 360]].map(([x, z]) => S([P(x, -6, z), P(x, -18, z), P(x + 30, -18, z), P(x + 30, -6, z)], { w: 1.3 })),
    ];
    // Panel de control.
    this.panel = [
      S([P(352, 14, 0), P(352, 300, 0)], { w: 1.6 }),
      S([P(378, 250, 0), P(494, 250, 0), P(494, 280, 0), P(378, 280, 0), P(378, 250, 0)], { w: 1.3 }),
      S(circle3(P, 436, 190, 0, 26, 'z'), { w: 1.4 }),
      S(circle3(P, 436, 190, 0, 9, 'z'), { w: 1 }),
      S(circle3(P, 436, 112, 0, 26, 'z'), { w: 1.4 }),
      S([P(400, 46, 0), P(472, 46, 0), P(472, 66, 0), P(400, 66, 0), P(400, 46, 0)], { w: 1.2 }),
    ];
    this.panelHatch = hatchQuad(P(380, 252, 0), P(380, 278, 0), P(492, 278, 0), P(492, 252, 0), 9, { d: 0.25 });

    // Cavidad.
    const c0 = { x0: 22, y0: 30, z0: 20, x1: 340, y1: 290, z1: 390 };
    const F = [P(c0.x0, c0.y0, c0.z0), P(c0.x1, c0.y0, c0.z0), P(c0.x1, c0.y1, c0.z0), P(c0.x0, c0.y1, c0.z0)];
    const B = [P(c0.x0, c0.y0, c0.z1), P(c0.x1, c0.y0, c0.z1), P(c0.x1, c0.y1, c0.z1), P(c0.x0, c0.y1, c0.z1)];
    this.cavFrame = [S([...F, F[0]], { w: 2, over: 3 })];
    this.cavInner = [
      S([...B, B[0]], { w: 1.1, d: 0.55 }),
      ...F.map((a, i) => S([a, B[i]], { w: 1.2, d: 0.62 })),
    ];
    this.cavSil = [F[0], F[1], P(c0.x1, c0.y0, c0.z1), B[2], B[3], F[3]];
    // Pared del fondo: rayado suave; puerto de la guía en la pared derecha.
    this.cavHatch = [
      ...hatchQuad(B[0], B[3], B[2], B[1], 14, { d: 0.18, dist: (u) => u * 0.7 }),
      ...hatchQuad(F[1], B[1], B[2], F[2], 12, { d: 0.2, dist: (u) => 0.3 + u * 0.7 }),
    ];
    const port = [P(340, 230, 150), P(340, 230, 236), P(340, 274, 236), P(340, 274, 150)];
    this.port = [S([...port, port[0]], { w: 1.2 }), ...hatchQuad(port[0], port[1], port[2], port[3], 6, { d: 0.3, w: 0.7 })];
    this.cavBox = c0;

    // Plato y motor.
    const pl = circle3(P, 181, 44, 205, 128, 'y', 0, TAU, 64);
    this.plate = [S(pl, { w: 1.7, over: 0 }), S(circle3(P, 181, 44, 205, 116, 'y', 0.4, 2.9, 40), { w: 0.9, d: 0.5 })];
    this.plateSil = pl;
    this.plateHatch = hatch(9, (u) => circle3(P, 181, 44, 205, 120 - u * 46, 'y', 0.3 + u * 0.3, 1.6 + u * 0.4, 18), { d: 0.28, w: 0.8, trim: 0.02 });
    this.ring = [S(circle3(P, 181, 38, 205, 74, 'y'), { w: 1, d: 0.5, dash: [5, 5] })];
    const mot = cylinder(P, [181, -14, 205], [181, 10, 205], 24, 'y', { hatch: 8 });
    this.motor = [...mot.strokes, S([P(181, 10, 205), P(181, 34, 205)], { w: 1.4 })];
    this.motorHatch = mot.hatch;

    // Guía de ondas.
    const wg = box(P, 340, 150, 120, 372, 285, 250, { w: 1.5 });
    this.wg = wg.edges;
    this.wgSil = wg.sil;
    this.wgHatch = hatchQuad(wg.faces.right[0], wg.faces.right[1], wg.faces.right[2], wg.faces.right[3], 12, { d: 0.32 });

    // Magnetrón: cuerpo, aletas de refrigeración, caja de filtro.
    const mg = box(P, 380, 182, 140, 452, 278, 230, { w: 1.8 });
    this.mag = [...mg.edges];
    this.magSil = mg.sil;
    this.magFins = [];
    for (let y = 194; y <= 268; y += 9) {
      this.magFins.push(S([P(380, y, 140), P(452, y, 140), P(452, y, 230)], { w: 0.9, d: 0.6, over: 0 }));
    }
    const ant = cylinder(P, [380, 230, 185], [362, 230, 185], 13, 'x', { hatch: 0 });
    this.magAnt = ant.strokes;
    const fb = box(P, 452, 200, 160, 486, 262, 214, { w: 1.3 });
    this.mag.push(...fb.edges);
    this.magSil2 = fb.sil;
    this.mag.push(S([P(486, 222, 187), P(500, 222, 187)], { w: 1.2 }), S([P(486, 240, 187), P(500, 240, 187)], { w: 1.2 }));
    this.magHatch = hatchQuad(mg.faces.right[0], mg.faces.right[1], mg.faces.right[2], mg.faces.right[3], 10, { d: 0.35 });

    // Ventilador (en un plano frontal, detrás del magnetrón).
    const fc = [440, 205, 340];
    this.fanRing = [S(circle3(P, ...fc, 56, 'z', 0, TAU, 56), { w: 1.6, over: 0 }), S(circle3(P, ...fc, 62, 'z', 0, TAU, 56), { w: 0.9, d: 0.5, over: 0 })];
    this.fanHub = [S(circle3(P, ...fc, 12, 'z', 0, TAU, 20), { w: 1.4 })];
    this.fanSil = circle3(P, ...fc, 64, 'z', 0, TAU, 40);
    this.fanC = P(...fc);
    const fm = cylinder(P, [440, 205, 352], [440, 205, 380], 20, 'z', { hatch: 6 });
    this.fanMotor = [...fm.strokes, ...fm.hatch];

    // Alimentación: transformador, condensador, diodo, cable.
    const tr = box(P, 386, 22, 232, 488, 112, 322, { w: 1.8 });
    const coil = box(P, 404, 30, 222, 470, 104, 332, { w: 1.3 });
    this.pow = [...tr.edges, ...coil.edges];
    this.powSil = [...tr.sil];
    this.powHatch = [
      ...hatchQuad(coil.faces.front[0], coil.faces.front[3], coil.faces.front[2], coil.faces.front[1], 14, { d: 0.42, w: 0.8, trim: 0.02 }),
      ...hatchQuad(tr.faces.right[0], tr.faces.right[1], tr.faces.right[2], tr.faces.right[3], 10, { d: 0.32 }),
    ];
    const cap = cylinder(P, [388, 54, 86], [462, 54, 86], 24, 'x', { hatch: 10 });
    this.cap = [...cap.strokes, S([P(462, 64, 86), P(476, 70, 86)], { w: 1 }), S([P(462, 44, 86), P(476, 40, 86)], { w: 1 })];
    this.capHatch = cap.hatch;
    this.capSil = [...cap.e0, ...cap.e1.slice().reverse()];
    const dio = box(P, 480, 34, 76, 506, 46, 96, { w: 1.1 });
    this.diode = [...dio.edges, S([P(497, 34, 76), P(497, 46, 76)], { w: 2, d: 0.9 })];
    this.cord = [S(spline([P(470, 60, 330), P(500, 60, 400), P(560, 40, 460), P(640, 20, 470), P(690, 10, 430)], 8), { w: 1.6 })];
    const plug = box(P, 690, 0, 400, 720, 30, 440, { w: 1.3 });
    this.cord.push(...plug.edges, S([P(720, 10, 412), P(742, 10, 412)], { w: 1.2 }), S([P(720, 20, 428), P(742, 20, 428)], { w: 1.2 }));

    // Líneas de explosión (azul, punteadas).
    this.xLines = {
      magnetron: S([P(370, 230, 185), [P(370, 230, 185)[0] + OFF.magnetron[0], P(370, 230, 185)[1] + OFF.magnetron[1]]], { ink: 'b', dash: [7, 6], w: 1, d: 0.6, over: 0 }),
      fan: S([P(440, 205, 340), [this.fanC[0] + OFF.fan[0], this.fanC[1] + OFF.fan[1]]], { ink: 'b', dash: [7, 6], w: 1, d: 0.6, over: 0 }),
      power: S([P(437, 67, 232), [P(437, 67, 232)[0] + OFF.power[0], P(437, 67, 232)[1] + OFF.power[1]]], { ink: 'b', dash: [7, 6], w: 1, d: 0.6, over: 0 }),
      plate: S([[P(181, 44, 205)[0], P(181, 44, 205)[1] + OFF.motor[1] + 10], [P(181, 44, 205)[0], P(181, 44, 205)[1] + OFF.plate[1]]], { ink: 'b', dash: [7, 6], w: 1, d: 0.6, over: 0 }),
    };
    this.liftLines = [P(0, 310, 0), P(520, 310, 400), P(520, 0, 0)].map((a) => S([a, [a[0], a[1] - LIFT]], { ink: 'b', dash: [6, 7], w: 0.9, d: 0.45, over: 0 }));

    // Cajas de cada pieza (para foco y zonas táctiles).
    const bb = (pts) => bboxOf(pts);
    this.bbox = {
      cavity: bb([...F, ...B]),
      plate: bb(pl),
      fan: bb(this.fanSil),
      magnetron: bb([...mg.sil, ...fb.sil, P(362, 230, 185)]),
      power: bb([...tr.sil, ...cap.e0, ...cap.e1, ...dio.sil]),
    };
  }

  off(id, t) {
    const o = OFF[id];
    if (!o) return [0, 0];
    const key = { magnetron: 'xMag', fan: 'xFan', power: 'xPow', plate: 'xPlate', motor: 'xPlate' }[id];
    const u = travel(seg(t, T[key][0], T[key][1]), 0.18, id === 'plate' ? 1.2 : 0.6);
    return [o[0] * u, o[1] * u];
  }

  doorAngle(t) {
    // La puerta espera, toma impulso y gira sobre su bisagra.
    return 1.72 * travel(seg(t, T.swing[0], T.swing[1]), 0.2, 0.5);
  }

  liftY(t) {
    const dip = Math.sin(seg(t, T.dip[0], T.dip[1]) * Math.PI) * 6;
    return dip - LIFT * E.inOut(seg(t, T.lift[0], T.lift[1]));
  }

  camera(t) {
    const u = E.inOut(seg(t, 5500, 3000));
    if (u <= 0) return CLOSED;
    if (u >= 1) {
      // Durante el recorrido, la cámara se inclina apenas hacia la pieza presentada.
      const k = this.tourIndex(t);
      if (k >= 0 && t < T.tour[0] + T.tour[1]) {
        const b = this.partBox(PARTS[k].id, t);
        const c = [b.x + b.w / 2, b.y + b.h / 2];
        const lp = Math.sin(clamp((t - T.tour[0] - k * 1100) / 1100) * Math.PI) * 0.06;
        return { x: OPEN.x + (c[0] - (OPEN.x + OPEN.w / 2)) * lp, y: OPEN.y + (c[1] - (OPEN.y + OPEN.h / 2)) * lp, w: OPEN.w * (1 - lp * 0.6), h: OPEN.h * (1 - lp * 0.6) };
      }
      return OPEN;
    }
    return { x: lerp(CLOSED.x, OPEN.x, u), y: lerp(CLOSED.y, OPEN.y, u), w: lerp(CLOSED.w, OPEN.w, u), h: lerp(CLOSED.h, OPEN.h, u) };
  }

  tourIndex(t) {
    const k = Math.floor((t - T.tour[0]) / 1100);
    return k >= 0 && k < 5 ? k : -1;
  }

  partBox(id, t) {
    const b = this.bbox[id];
    const o = this.off(id, t);
    return { x: b.x + o[0], y: b.y + o[1], w: b.w, h: b.h };
  }

  noteKey(t) {
    if (this.sel) return this.sel;
    if (t < T.dip[0]) return 'intro';
    if (t < T.xMag[0]) return 'lift';
    if (t < this.dur) return 'parts';
    return 'rest';
  }

  exitPoint() { return P(437, 67, 280).map((v, i) => v + OFF.power[i]); }

  pick(id) {
    if (!id || id === this.sel) {
      this.sel = null;
      this.setFocus(null);
      return;
    }
    this.sel = id;
    if (this.t < T.xPlate[0] + T.xPlate[1]) this.t = T.xPlate[0] + T.xPlate[1];
    this.setFocus(pad(this.partBox(id, this.t), id === 'cavity' ? 70 : 110, 90));
  }
  clearFocus() { this.sel = null; this.setFocus(null); }
  onPick(id) { this.pick(PARTS.some((q) => q.id === id) ? id : null); }
  onHover(id) { this.hov = id; }

  controls() {
    return `<p class="group-label">Piezas</p>` + PARTS.map((q) => `<button type="button" data-part="${q.id}" aria-pressed="false"><span class="n">${q.n}</span>${q.name}</button>`).join('');
  }
  bind(box, app) {
    this.app = app;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-part]');
      if (!b) return;
      this.pick(b.dataset.part);
      app.wake();
    });
  }
  syncControls(box) {
    box.querySelectorAll('[data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === this.sel)));
  }

  draw(R) {
    const t = R.t;
    const g = R.g;
    const sel = this.sel;
    const dim = (id) => (sel && sel !== id ? 0.22 : 1);
    const hl = (id) => (this.hov === id && !sel ? 1.18 : 1);

    // Preparación: guías de construcción.
    R.seq(this.guides, p('guides', t, E.draw), { a: 0.9 - 0.4 * seg(t, 8000, 3000) }, 0.5);

    // Sombra en el piso y base.
    const lift = this.liftY(t);
    const liftU = -lift / LIFT;
    R.seq(this.shadow, p('shade', t, E.draw), { a: 1 - 0.75 * clamp(liftU) }, 0.6);
    R.seq(this.base, p('base', t, E.draw), {}, 0.5);

    // Guías de elevación de la carcasa.
    if (t > T.lift[0]) R.seq(this.liftLines, clamp(liftU * 1.1), { a: 0.8 }, 0.2);

    // Carcasa (sube y se aleja).
    g.save();
    g.translate(0, lift);
    const ca = sel ? 0.18 : 1;
    R.seq(this.casing, p('casing', t, E.draw), { a: ca }, 0.4);
    R.seq(this.casingHatch, p('shade', t, E.draw), { a: ca }, 0.7);
    g.restore();

    const pr = (k) => p(k, t, E.draw);

    // Motor (detrás del piso) y aro de rodillos.
    if (t > T.motor[0]) {
      const o = this.off('motor', t);
      g.save();
      g.translate(...o);
      R.seq(this.motor, pr('motor'), { a: dim('plate') * hl('plate') }, 0.4);
      R.seq(this.motorHatch, pr('motor'), { a: dim('plate') }, 0.6);
      g.restore();
    }
    if (t > T.xPlate[0]) R.st(this.xLines.plate, p('xPlate', t, E.out), { a: dim('plate') });

    // Cavidad.
    if (t > T.cavity[0]) {
      const a = dim('cavity') * hl('cavity');
      R.seq(this.cavInner, pr('cavity'), { a }, 0.5);
      R.seq(this.cavHatch, seg(t, T.cavity[0] + 600, 1200), { a }, 0.6);
      R.seq(this.port, seg(t, T.cavity[0] + 900, 600), { a: dim('cavity') }, 0.5);
      R.seq(this.cavFrame, pr('cavity'), { a }, 0.3);
      if (sel === 'cavity' || this.hov === 'cavity') R.wash(this.cavSil, 'b', 0.04);
      R.hit('cavity', this.cavSil);
    }

    // Plato.
    if (t > T.plate[0]) {
      const o = this.off('plate', t);
      g.save();
      g.translate(...o);
      R.st(this.ring[0], pr('plate'), { a: dim('plate') * 0.8 });
      R.erase(this.plateSil, clamp(pr('plate') * 1.4) * 0.9);
      R.seq(this.plate, pr('plate'), { a: dim('plate') * hl('plate') }, 0.3);
      R.seq(this.plateHatch, seg(t, T.plate[0] + 400, 800), { a: dim('plate') }, 0.6);
      g.restore();
      R.hit('plate', this.plateSil.map(([x, y]) => [x + o[0], y + o[1]]));
    }

    // Puerta: gira sobre su bisagra.
    this.drawDoor(R, t, sel ? 0.2 : 1);

    // Panel de control.
    R.seq(this.panel, pr('panel'), { a: sel ? 0.25 : 1 }, 0.5);
    R.seq(this.panelHatch, seg(t, T.panel[0] + 600, 600), { a: sel ? 0.25 : 1 }, 0.6);

    // Ventilador.
    if (t > T.fan[0]) {
      if (t > T.xFan[0]) R.st(this.xLines.fan, p('xFan', t, E.out), { a: dim('fan') });
      const o = this.off('fan', t);
      g.save();
      g.translate(...o);
      const a = dim('fan') * hl('fan');
      R.erase(this.fanSil, clamp(pr('fan') * 1.5));
      R.seq(this.fanMotor, pr('fan'), { a }, 0.5);
      R.seq(this.fanRing, pr('fan'), { a }, 0.4);
      this.drawFanBlades(R, pr('fan'), a);
      R.seq(this.fanHub, pr('fan'), { a }, 0.4);
      g.restore();
      R.hit('fan', this.fanSil.map(([x, y]) => [x + o[0], y + o[1]]));
    }

    // Guía de ondas (fija a la cavidad).
    if (t > T.guide[0]) {
      R.erase(this.wgSil, clamp(pr('guide') * 1.5));
      R.seq(this.wg, pr('guide'), { a: dim('magnetron') * 0.9 + (sel === 'magnetron' ? 0.1 : 0) }, 0.4);
      R.seq(this.wgHatch, pr('guide'), { a: dim('magnetron') }, 0.6);
    }

    // Magnetrón.
    if (t > T.magnetron[0]) {
      if (t > T.xMag[0]) R.st(this.xLines.magnetron, p('xMag', t, E.out), { a: dim('magnetron') });
      const o = this.off('magnetron', t);
      g.save();
      g.translate(...o);
      const a = dim('magnetron') * hl('magnetron');
      R.seq(this.magAnt, pr('magnetron'), { a }, 0.4);
      R.erase(this.magSil, clamp(pr('magnetron') * 1.5));
      R.erase(this.magSil2, clamp(pr('magnetron') * 1.5));
      R.seq(this.mag, pr('magnetron'), { a }, 0.35);
      R.seq(this.magFins, seg(t, T.magnetron[0] + 500, 700), { a }, 0.5);
      R.seq(this.magHatch, seg(t, T.magnetron[0] + 700, 600), { a }, 0.6);
      g.restore();
      const b = this.partBox('magnetron', t);
      R.hit('magnetron', [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]);
    }

    // Alimentación.
    if (t > T.power[0]) {
      if (t > T.xPow[0]) R.st(this.xLines.power, p('xPow', t, E.out), { a: dim('power') });
      const o = this.off('power', t);
      g.save();
      g.translate(...o);
      const a = dim('power') * hl('power');
      const pp = pr('power');
      R.seq(this.cord, pp, { a: a * 0.85 }, 0.4);
      R.erase(this.powSil, clamp(pp * 1.5));
      R.seq(this.pow, pp, { a }, 0.35);
      R.seq(this.powHatch, seg(t, T.power[0] + 500, 900), { a }, 0.6);
      R.erase(this.capSil, clamp(pp * 1.5));
      R.seq(this.cap, seg(t, T.power[0] + 300, 800), { a }, 0.4);
      R.seq(this.capHatch, seg(t, T.power[0] + 700, 600), { a }, 0.6);
      R.seq(this.diode, seg(t, T.power[0] + 700, 500), { a }, 0.4);
      g.restore();
      const b = this.partBox('power', t);
      R.hit('power', [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]);
    }

    // Leyenda de la figura, en el mundo.
    R.text(230, 905, 'fig. 1 — horno convencional, vista explotada', seg(t, T.xPlate[0] + 800, 1400), { size: 17, ink: 'b', font: MONO_FONT, a: 0.75 });
    R.text(410, 840, 'fig. 1 — horno cerrado', seg(t, 4600, 900) * (1 - seg(t, T.lift[0], 600)), { size: 15, ink: 'b', font: MONO_FONT, a: 0.75 });

    // Etiquetas: una por vez durante el recorrido; luego sólo números.
    const tourK = this.tourIndex(t);
    const restU = seg(t, T.tour[0] + T.tour[1] - 300, 700);
    PARTS.forEach((q, i) => {
      const b = this.partBox(q.id, t);
      const c = [b.x + b.w / 2, b.y + b.h / 2];
      if (q.id === 'cavity') c[1] = b.y + b.h * 0.3;
      const showName = sel === q.id || (!sel && this.hov === q.id) || (!sel && !this.hov && tourK === i);
      if (showName) {
        const local = sel === q.id || this.hov === q.id ? 1 : clamp((t - T.tour[0] - i * 1100) / 650);
        R.label(c[0], c[1], q.name, local, { dx: q.dx, dy: q.dy, size: 21 });
      } else if (t > T.tour[0] + i * 1100 + 700 || restU > 0) {
        const u = Math.max(clamp((t - T.tour[0] - i * 1100 - 700) / 400), restU);
        R.label(c[0], c[1], String(q.n), u, { dx: q.dx * 0.45, dy: q.dy * 0.45, size: 17, circle: true, ink: 'b', a: sel ? 0.4 : 0.85 });
      }
    });
    if (t > this.dur && !sel && !this.hov) R.label(OPEN.x + 40, OPEN.y + 60, 'tocá una pieza o su número', seg(t, this.dur, 900), { leader: false, size: 18, ink: 'b' });
  }

  drawFanBlades(R, pp, a) {
    if (pp <= 0) return;
    const [cx, cy] = this.fanC;
    const g = R.g;
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * TAU + 0.3;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const r = 14 + u * 38;
        const ang = a0 + u * 0.7;
        pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
      }
      for (let k = 10; k >= 0; k--) {
        const u = k / 10;
        const r = 14 + u * 38;
        const ang = a0 + u * 0.7 + 0.42 + u * 0.18;
        pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
      }
      R.sk(pts, clamp(pp * 1.3 - i * 0.06), { seed: 300 + i, w: 1.2, a });
    }
    g.globalAlpha = 1;
  }

  drawDoor(R, t, alpha) {
    const th = this.doorAngle(t);
    const c = Math.cos(th), s = Math.sin(th);
    const D = (u, y, w = 0) => P(u * c + w * s, y, -u * s + w * c);
    const pp = p('door', t, E.draw);
    if (pp <= 0) return;
    const outline = [D(0, 14), D(352, 14), D(352, 300), D(0, 300), D(0, 14)];
    const thick = [D(352, 14, -24), D(352, 300, -24), D(0, 300, -24)];
    const win = [D(34, 54), D(318, 54), D(318, 262), D(34, 262), D(34, 54)];
    if (th > 0.02) {
      // El canto de la puerta aparece al girar.
      const sil = [D(0, 14), D(352, 14), D(352, 14, -24), D(352, 300, -24), D(0, 300, -24), D(0, 300)];
      R.erase(sil, 1);
      R.sk([D(352, 14), D(352, 14, -24), D(352, 300, -24), D(352, 300)], 1, { seed: 41, w: 1.4, a: alpha });
      R.sk([D(352, 300, -24), D(0, 300, -24)], 1, { seed: 42, w: 1.3, a: alpha });
    }
    R.sk(outline, pp, { seed: 40, w: 1.9, a: alpha });
    R.sk(win, clamp(pp * 1.4 - 0.3), { seed: 43, w: 1.4, a: alpha });
    // Malla de la ventana: rayado cruzado muy fino.
    const mp = seg(t, T.door[0] + 700, 900);
    if (mp > 0) {
      for (let i = 1; i < 14; i++) {
        const u = 34 + (284 * i) / 14;
        R.sk([D(u, 58), D(u, 258)], clamp(mp * 2 - i / 14), { seed: 60 + i, w: 0.6, d: 0.35, a: alpha, strands: 1 });
      }
      for (let i = 1; i < 10; i++) {
        const y = 54 + (208 * i) / 10;
        R.sk([D(38, y), D(314, y)], clamp(mp * 2 - i / 10 - 0.2), { seed: 90 + i, w: 0.6, d: 0.3, a: alpha, strands: 1 });
      }
    }
  }
}
export { OPEN as MAP_OPEN, T as MAP_T };
