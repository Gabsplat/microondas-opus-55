// 05 / LA PUERTA TAMBIÉN TRABAJA — la malla deja ver y atenúa la RF; los enclavamientos cortan la generación.
import { E, seg, clamp, lerp, lerpRect, rect, TAU, travel } from '../core.js';
import { S, arc, hatch, hatchQuad, rectPts, MONO_FONT, INK } from '../pencil.js';
import { Scene } from '../scene.js';

const OV = { x0: 110, x1: 830, y0: 330, y1: 770 };
const DOOR = { x0: 120, x1: 600, y0: 340, y1: 760 };
const WIN = { x0: 165, x1: 555, y0: 395, y1: 705 };
const LUPA = { cx: 1185, cy: 330, r: 245 };
const SPOT = [470, 470]; // punto de la ventana que se amplía
const IL = rect(880, 615, 690, 360); // esquema de enclavamientos

const T = {
  guides: [0, 700],
  oven: [700, 2200],
  mesh: [2600, 1400],
  push: [4300, 1500],
  bubble: [5300, 1300],
  sheet: [6300, 1500],
  waves: [7800, 3400],
  toIL: [11200, 1500],
  il: [11800, 2800],
  wide: [14600, 1200],
  open: [15800, 0],
};

const K = {
  front: rect(60, 250, 1000, 600),
  mesh: rect(380, 60, 1110, 600),
  il: rect(840, 560, 760, 440),
  wide: rect(60, 60, 1530, 930),
};

export class DoorScene extends Scene {
  constructor() {
    super();
    this.num = '05';
    this.short = 'La puerta';
    this.kicker = 'La puerta también trabaja';
    this.title = 'Ver adentro, dejar las ondas adentro';
    this.alt = 'Frente del horno con una lupa sobre la malla de la ventana: la luz pasa por los agujeros y las microondas se reflejan. Un esquema de enclavamientos muestra cómo, al abrir, los interruptores cortan la generación antes de que la puerta se separe.';
    this.scope = 'Esquema conceptual de la puerta y sus interruptores; no es un plano de un modelo. Un horno real no debe abrirse ni desarmarse para verlo funcionar.';
    this.dur = 22500;
    this.phases = [0, 700, 4300, 15800];
    this.loop = false;
    this.openAt = T.open[0];
    this.closeAt = -1;
    this.notes = {
      intro: '<p>La puerta tiene dos trabajos: dejarte mirar adentro y mantener las microondas adentro.</p>',
      mesh: '<p>En la ventana hay una lámina de metal con agujeros de 1 a 2 mm. La <strong>luz visible</strong>, de onda muchísimo más corta, pasa por ellos. Las <strong>microondas</strong>, de unos 12 cm, son demasiado grandes: casi toda la onda se refleja hacia adentro.</p>',
      il: '<p>El otro trabajo es de los <strong>enclavamientos</strong>: interruptores que la puerta aprieta al cerrarse. Dos están en serie con la alimentación; un tercero, el <strong>monitor</strong>, vigila que funcionen.</p>',
      open: '<p>Al abrir, primero se libera el pestillo y los interruptores cortan la alimentación: el magnetrón deja de generar. <strong>Recién después</strong> la puerta se separa del marco.</p>',
      closed: '<p>Al cerrar, los ganchos vuelven a apretar los interruptores. Aun así, el horno no emite hasta que alguien lo vuelva a encender.</p>',
      rest: '<p>Abrí y cerrá la puerta para ver el orden. Si un interruptor quedara pegado, el monitor cortocircuita la línea y funde el fusible: el horno queda sin poder funcionar.</p>',
    };
    this.defs = [
      ['Malla metálica', 'lámina de metal perforada en la ventana: refleja las microondas y deja pasar la luz.'],
      ['Enclavamiento', 'interruptor que sólo permite funcionar con la puerta cerrada. La norma exige al menos dos.'],
      ['Interruptor monitor', 'detecta si los otros fallan y deja el horno sin alimentación fundiendo el fusible.'],
      ['Fusible', 'pieza que se corta a propósito cuando pasa demasiada corriente.'],
    ];
    this.controlsEarly = false;
  }

  resetState() { this.openAt = T.open[0]; this.closeAt = -1; }

  build() {
    this.guides = [
      S([[60, OV.y1 + 4], [1560, OV.y1 + 4]], { ink: 'b', w: 0.9, d: 0.4 }),
      S([[DOOR.x0, 260], [DOOR.x0, 840]], { ink: 'b', w: 0.8, d: 0.35, dash: [6, 8] }),
    ];
    // Frente del horno (elevación).
    this.oven = [
      S(rectPts(OV.x0, OV.y0, OV.x1 - OV.x0, OV.y1 - OV.y0), { w: 2.1, over: 4 }),
      S([[DOOR.x1 + 14, OV.y0 + 10], [DOOR.x1 + 14, OV.y1 - 10]], { w: 1.4 }),
      S(rectPts(650, 380, 140, 44), { w: 1.3 }),
      S(arc(720, 520, 40, 40, 0, TAU), { w: 1.4 }),
      S(arc(720, 640, 40, 40, 0, TAU), { w: 1.4 }),
      S(rectPts(675, 700, 90, 30), { w: 1.2 }),
      S([[OV.x0 + 30, OV.y1], [OV.x0 + 30, OV.y1 + 18], [OV.x0 + 80, OV.y1 + 18], [OV.x0 + 80, OV.y1]], { w: 1.3 }),
      S([[OV.x1 - 80, OV.y1], [OV.x1 - 80, OV.y1 + 18], [OV.x1 - 30, OV.y1 + 18], [OV.x1 - 30, OV.y1]], { w: 1.3 }),
    ];
    this.ovenHatch = hatchQuad([650, 380], [650, 424], [790, 424], [790, 380], 10, { d: 0.25 });
    // Malla de la ventana: punteado en retícula.
    this.meshDots = [];
    for (let y = WIN.y0 + 10; y < WIN.y1 - 6; y += 11) {
      const row = [];
      for (let x = WIN.x0 + 10 + ((y / 11) % 2) * 5; x < WIN.x1 - 6; x += 11) row.push([x, y]);
      this.meshDots.push(row);
    }
    // Lupa: círculo y líneas al punto de la ventana.
    const L = LUPA;
    this.lupa = [
      S(arc(SPOT[0], SPOT[1], 26, 26, 0, TAU, 24), { w: 1.4 }),
      S([[SPOT[0] + 18, SPOT[1] - 20], [L.cx - L.r * 0.82, L.cy - L.r * 0.57]], { w: 1, d: 0.6 }),
      S([[SPOT[0] + 20, SPOT[1] + 18], [L.cx - L.r * 0.7, L.cy + L.r * 0.72]], { w: 1, d: 0.6 }),
      S(arc(L.cx, L.cy, L.r, L.r, 0, TAU, 90), { w: 2.2, over: 0 }),
    ];
    // Corte de la puerta dentro de la lupa: lámina perforada (segmentos con huecos) y vidrio.
    const sx = L.cx - 10;
    this.sheet = [];
    for (let y = L.cy - L.r + 20; y < L.cy + L.r - 20; y += 26) {
      const yy0 = y + 8, yy1 = y + 26;
      const dy = Math.sqrt(Math.max(0, L.r * L.r - (y + 13 - L.cy) ** 2));
      if (dy < 30) continue;
      this.sheet.push(S([[sx, yy0], [sx, Math.min(yy1, L.cy + L.r - 10)]], { w: 4.2, d: 0.95, strands: 3 }));
    }
    const glassX = sx + 34;
    this.glass = [S([[glassX, L.cy - L.r + 24], [glassX, L.cy + L.r - 24]], { w: 1.2, d: 0.6 }), S([[glassX + 12, L.cy - L.r + 28], [glassX + 12, L.cy + L.r - 28]], { w: 1.2, d: 0.6 })];
    this.glassHatch = hatchQuad([glassX, L.cy - 180], [glassX, L.cy + 180], [glassX + 12, L.cy + 180], [glassX + 12, L.cy - 180], 18, { d: 0.25, w: 0.7 });
    // Ojo del observador.
    const ex = L.cx + 170, ey = L.cy + 10;
    this.eye = [
      S([[ex + 40, ey - 18], [ex + 10, ey - 22], [ex - 18, ey], [ex + 10, ey + 22], [ex + 40, ey + 18]], { w: 1.5 }),
      S(arc(ex + 4, ey, 9, 12, Math.PI * 0.5, Math.PI * 1.5, 12), { w: 1.6 }),
    ];
    this.eyePos = [ex - 18, ey];
    // Enclavamientos.
    this.buildInterlocks();
  }

  buildInterlocks() {
    const r = IL;
    const yL = r.y + 70, yN = r.y + 300; // línea y neutro
    this.ilY = { yL, yN };
    const X = { red: r.x + 30, fuse: r.x + 140, s1: r.x + 280, s2: r.x + 400, load: r.x + 560, mon: r.x + 205 };
    this.ilX = X;
    this.ilStatic = [
      S([[X.red, yL], [X.fuse - 30, yL]], { w: 1.5 }),
      S(rectPts(X.fuse - 30, yL - 12, 60, 24), { w: 1.4 }),
      S([[X.fuse + 30, yL], [X.s1 - 26, yL]], { w: 1.5 }),
      S([[X.s1 + 26, yL], [X.s2 - 26, yL]], { w: 1.5 }),
      S([[X.s2 + 26, yL], [X.load - 40, yL]], { w: 1.5 }),
      S(rectPts(X.load - 40, yL - 34, 150, 270), { w: 1.8 }),
      S([[X.load - 40, yN], [X.red, yN]], { w: 1.5 }),
      S([[X.mon, yL], [X.mon, yL + 90]], { w: 1.3 }),
      S([[X.mon, yL + 140], [X.mon, yN]], { w: 1.3 }),
      S(arc(X.red, yL, 7, 7, 0, TAU, 10), { w: 1.4 }),
      S(arc(X.red, yN, 7, 7, 0, TAU, 10), { w: 1.4 }),
    ];
    // Canto de la puerta con dos ganchos (se mueve al abrir).
    this.doorEdge = { x: r.x + 330, y0: yL + 70, y1: yN - 30 };
  }

  // Estado de la puerta según el reloj: pestillo, contactos, RF y ángulo.
  doorState(t) {
    const opening = this.openAt >= 0 && t >= this.openAt && this.closeAt < this.openAt;
    const closing = this.closeAt >= 0 && t >= this.closeAt && this.closeAt > this.openAt;
    if (closing) {
      const u = t - this.closeAt;
      const ang = 1 - travel(seg(u, 0, 1600), 0.15, 0.4);
      const latch = 1 - seg(u, 1500, 400);
      const contacts = u > 2000 ? 1 : 0; // primario y secundario cerrados
      const monitorOpen = u > 1800;
      return { ang, latch, contacts, monitorOpen, rf: 0, rfStopped: true, phase: u > 2000 ? 'closed' : 'closing', u };
    }
    if (opening) {
      const u = t - this.openAt;
      const latch = E.inOut(seg(u, 0, 500));
      const contacts = u > 800 ? 0 : 1;
      const rf = 1 - E.out(seg(u, 850, 600));
      const monitorOpen = !(u > 1300);
      const ang = travel(seg(u, 1900, 1900), 0.2, 0.5);
      return { ang, latch, contacts, monitorOpen, rf, rfStopped: u > 850, phase: 'opening', u };
    }
    if (this.forceOff) return { ang: 0, latch: 0, contacts: 1, monitorOpen: true, rf: 0, rfStopped: true, phase: 'closed', u: 9999 };
    return { ang: 0, latch: 0, contacts: 1, monitorOpen: true, rf: 1, rfStopped: false, phase: 'running', u: 0 };
  }

  camera(t) {
    if (t < T.push[0]) return K.front;
    if (t < T.toIL[0]) return lerpRect(K.front, K.mesh, E.inOut(seg(t, ...T.push)), 0.05);
    if (t < T.wide[0]) return lerpRect(K.mesh, K.il, E.inOut(seg(t, ...T.toIL)), -0.06);
    return lerpRect(K.il, K.wide, E.inOut(seg(t, ...T.wide)));
  }

  noteKey(t) {
    const st = this.doorState(t);
    if (t >= this.dur) {
      if (st.phase === 'closed' || st.phase === 'closing') return 'closed';
      if (st.phase === 'opening' && st.u < 4200) return 'open';
      return 'rest';
    }
    if (t < T.push[0] + 800) return 'intro';
    if (t < T.toIL[0] + 600) return 'mesh';
    if (t < T.open[0]) return 'il';
    return 'open';
  }

  exitPoint() { return [OV.x0 + (OV.x1 - OV.x0) / 2, OV.y0 + 200]; }

  controls() {
    return `<p class="group-label">Puerta</p>
      <button type="button" data-door="open" class="cta">Abrir la puerta</button>
      <button type="button" data-door="close">Cerrar la puerta</button>
      <p class="status-chip" data-rf>Radiofrecuencia: <b>—</b></p>`;
  }
  bind(box, app) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-door]');
      if (!b) return;
      if (this.t < this.dur) this.t = this.dur;
      const st = this.doorState(this.t);
      if (b.dataset.door === 'open' && st.phase !== 'opening') {
        this.openAt = this.t;
      } else if (b.dataset.door === 'close' && st.phase === 'opening') {
        this.closeAt = this.t;
      }
      this.paused = false;
      app.wake();
    });
  }
  syncControls(box) {
    const st = this.doorState(this.t);
    const o = box.querySelector('[data-door="open"]'), c = box.querySelector('[data-door="close"]');
    if (o) o.disabled = st.phase === 'opening';
    if (c) c.disabled = st.phase !== 'opening' || st.ang < 0.9;
    const rf = box.querySelector('[data-rf]');
    if (rf) {
      const on = st.rf > 0.5;
      rf.classList.toggle('off', !on);
      rf.querySelector('b').textContent = on ? 'generando' : st.phase === 'closed' ? 'detenida (hay que volver a encender)' : 'detenida';
    }
  }
  busy() {
    const st = this.doorState(this.t);
    return !this.paused && ((st.phase === 'opening' && st.u < 4500) || (st.phase === 'closing'));
  }

  draw(R) {
    const t = R.t;
    const st = this.doorState(t);
    R.seq(this.guides, seg(t, ...T.guides), { a: 0.7 }, 0.4);
    this.drawOven(R, t, st);
    const pb = seg(t, ...T.bubble);
    if (pb > 0) this.drawLupa(R, t, pb);
    const pi = seg(t, ...T.il);
    if (pi > 0) this.drawIL(R, t, pi, st);
  }

  drawOven(R, t, st) {
    const po = E.draw(seg(t, ...T.oven));
    // Interior que aparece detrás de la puerta al abrirse (sin funcionamiento).
    if (st.ang > 0.01) {
      const q = rectPts(DOOR.x0 + 20, DOOR.y0 + 20, DOOR.x1 - DOOR.x0 - 40, DOOR.y1 - DOOR.y0 - 40);
      R.sk(q, 1, { seed: 7000, w: 1.4 });
      R.sk([[DOOR.x0 + 20, DOOR.y1 - 20], [DOOR.x0 + 90, DOOR.y1 - 90], [DOOR.x1 - 90, DOOR.y1 - 90], [DOOR.x1 - 20, DOOR.y1 - 20]], 1, { seed: 7001, w: 1.1, d: 0.6 });
      R.sk([[DOOR.x0 + 90, DOOR.y1 - 90], [DOOR.x0 + 90, DOOR.y0 + 90], [DOOR.x1 - 90, DOOR.y0 + 90], [DOOR.x1 - 90, DOOR.y1 - 90]], 1, { seed: 7002, w: 1.1, d: 0.6 });
      R.text(DOOR.x0 + 130, DOOR.y0 + 160, 'sin RF: el magnetrón ya se detuvo', clamp(st.ang * 3), { size: 19, font: MONO_FONT, ink: 'b' });
    }
    R.seq(this.oven, po, {}, 0.35);
    R.seq(this.ovenHatch, seg(t, T.oven[0] + 1200, 700), {}, 0.6);
    // Puerta (rota sobre la bisagra izquierda; el ancho aparente se achica).
    const c = Math.cos(st.ang * 1.45), s = Math.sin(st.ang * 1.45);
    const W = DOOR.x1 - DOOR.x0;
    const X = (u, y) => [DOOR.x0 + u * W * c, y + (y - (DOOR.y0 + DOOR.y1) / 2) * s * 0.12 * u + s * 30 * u];
    const door = [X(0, DOOR.y0), X(1, DOOR.y0), X(1, DOOR.y1), X(0, DOOR.y1), X(0, DOOR.y0)];
    if (st.ang > 0.01) R.erase(door, 1);
    R.sk(door, E.draw(seg(t, T.oven[0] + 300, 1300)), { seed: 7010, w: 2 });
    const wx0 = (WIN.x0 - DOOR.x0) / W, wx1 = (WIN.x1 - DOOR.x0) / W;
    const win = [X(wx0, WIN.y0), X(wx1, WIN.y0), X(wx1, WIN.y1), X(wx0, WIN.y1), X(wx0, WIN.y0)];
    R.sk(win, E.draw(seg(t, T.oven[0] + 900, 1100)), { seed: 7011, w: 1.6 });
    if (st.ang > 0.05) R.sk([X(1, DOOR.y0), [X(1, DOOR.y0)[0] + 16 * s, X(1, DOOR.y0)[1] - 6], [X(1, DOOR.y1)[0] + 16 * s, X(1, DOOR.y1)[1] - 6], X(1, DOOR.y1)], 1, { seed: 7012, w: 1.4 });
    // Malla: puntos que se revelan por filas.
    const pm = seg(t, ...T.mesh);
    if (pm > 0) {
      const g = R.g;
      g.fillStyle = INK.g;
      this.meshDots.forEach((row, k) => {
        const vis = clamp(pm * 1.6 - (k / this.meshDots.length) * 0.6);
        if (vis <= 0) return;
        g.globalAlpha = 0.45 * vis;
        g.beginPath();
        const n = Math.floor(row.length * vis);
        for (let i = 0; i < n; i++) {
          const [x, y] = row[i];
          const [px, py] = X((x - DOOR.x0) / W, y);
          g.moveTo(px + 2.4 * c, py);
          g.arc(px, py, 2.4, 0, TAU);
        }
        g.fill();
      });
      g.globalAlpha = 1;
    }
    R.label(DOOR.x0 + 30, DOOR.y0 + 30, 'puerta con ventana', seg(t, 2600, 700) * (1 - seg(t, T.push[0], 500)), { dx: -30, dy: -60 });
    R.label(WIN.x0 + 60, WIN.y1 - 40, 'malla de metal perforada', seg(t, T.mesh[0] + 900, 700) * (1 - seg(t, T.bubble[0] + 600, 500)), { dx: 40, dy: 120 });
    // Pestillo / botón de apertura del panel.
    R.label(720, 715, 'botón de apertura', seg(t, 3400, 700) * (1 - seg(t, T.push[0], 500)) + (st.phase === 'opening' && st.u < 1500 ? 1 : 0) * seg(t, this.dur - 1, 1), { dx: 60, dy: 70, size: 16 });
  }

  drawLupa(R, t, pb) {
    const L = LUPA;
    R.erase(arc(L.cx, L.cy, L.r * E.out(pb), L.r * E.out(pb), 0, TAU, 60), 1);
    R.seq(this.lupa, E.draw(pb), {}, 0.5);
    const ps = seg(t, ...T.sheet);
    R.seq(this.sheet, E.draw(ps), {}, 0.6);
    R.seq(this.glass, E.draw(clamp(ps * 1.4 - 0.4)), {}, 0.3);
    R.seq(this.glassHatch, clamp(ps * 1.4 - 0.4), {}, 0.6);
    R.text(L.cx - 160, L.cy - L.r + 70, 'adentro', ps, { size: 18, font: MONO_FONT, ink: 'b' });
    R.text(L.cx + 70, L.cy - L.r + 70, 'afuera', ps, { size: 18, font: MONO_FONT, ink: 'b' });
    R.label(L.cx - 10, L.cy - L.r + 110, 'agujeros de 1–2 mm', clamp(ps * 2 - 1), { dx: 30, dy: -80, size: 17 });
    // Ondas: la microonda (larguísima) se refleja; la luz (cortita) atraviesa.
    const pw = seg(t, ...T.waves);
    if (pw > 0) {
      const g = R.g;
      g.save();
      g.beginPath();
      g.arc(L.cx, L.cy, L.r - 4, 0, TAU);
      g.clip();
      const tt = (t - T.waves[0]) / 1000;
      const sx = L.cx - 10;
      // Microonda: una curva lenta que avanza hacia la lámina y vuelve.
      const lam = 520;
      const inc = [], ref = [];
      for (let x = L.cx - L.r; x <= sx - 4; x += 6) {
        const front = L.cx - L.r + tt * 260;
        if (x < front) inc.push([x, L.cy - 70 + Math.sin(((x - tt * 120) / lam) * TAU) * 52]);
        if (tt > 1.5) ref.push([x, L.cy - 70 + Math.sin(((x + tt * 120) / lam) * TAU + 1) * 44]);
      }
      if (inc.length > 1) R.sk(inc, 1, { seed: 7100, w: 2.6, a: pw });
      if (ref.length > 1) R.sk(ref, 1, { seed: 7101, w: 1.6, d: 0.6, a: clamp(tt - 1.5) });
      // Luz visible: ondas finísimas que pasan por los agujeros hasta el ojo.
      if (tt > 1.2) {
        for (let k = 0; k < 3; k++) {
          const y = L.cy + 60 + k * 26 - 26;
          const pts = [];
          const x0 = L.cx - L.r + 30, x1 = this.eyePos[0] - 6;
          const reach = lerp(x0, x1, clamp((tt - 1.2 - k * 0.15) / 2));
          for (let x = x0; x <= reach; x += 2) pts.push([x, y + Math.sin(x * 0.55 + tt * 6) * 3 + (x > sx ? (x - sx) * (this.eyePos[1] - y) / (x1 - sx) : 0)]);
          if (pts.length > 1) R.sk(pts, 1, { seed: 7200 + k, w: 1, a: clamp(tt - 1.2) });
        }
      }
      g.restore();
      R.seq(this.eye, clamp((tt - 1) / 0.8), {}, 0.4);
      R.label(L.cx - 150, L.cy - 70, 'microonda (12 cm): rebota', clamp((tt - 1.8) / 0.8), { dx: -60, dy: -150, size: 18 });
      R.label(L.cx + 110, L.cy + 48, 'luz visible: pasa', clamp((tt - 2.4) / 0.8), { dx: -10, dy: 130, size: 18 });
    }
    R.text(L.cx - 150, L.cy - L.r - 18, 'corte de la puerta · no está a escala', pb, { size: 16, font: MONO_FONT, ink: 'b', a: 0.8 });
  }

  drawIL(R, t, pi, st) {
    const r = IL, X = this.ilX, { yL, yN } = this.ilY;
    R.text(r.x, r.y + 10, 'enclavamientos (esquema)', pi, { size: 20, font: MONO_FONT, ink: 'b' });
    R.seq(this.ilStatic, E.draw(pi), {}, 0.4);
    const lab = (txt, x, y, at, o = {}) => R.text(x, y, txt, clamp((t - T.il[0] - at) / 600), { size: 16, ...o });
    lab('220 V', X.red - 22, yL - 18, 600);
    lab('fusible', X.fuse - 28, yL - 22, 900);
    lab('primario', X.s1 - 34, yL - 28, 1200);
    lab('secundario', X.s2 - 40, yL - 28, 1400);
    lab('transformador', X.load - 34, yL + 20, 1600, { size: 15 });
    lab('→ magnetrón', X.load - 34, yL + 44, 1700, { size: 15 });
    lab('monitor', X.mon + 14, yL + 120, 1900);
    const pv = clamp((t - T.il[0] - 500) / 900);
    if (pv <= 0) return;
    // Interruptores: palanca cerrada (horizontal) o abierta (inclinada).
    const sw = (x, y, closed, seed) => {
      const a = closed ? 0.06 : 0.55;
      R.sk([[x - 26, y], [x + 26 * Math.cos(a) - 0, y - 52 * Math.sin(a) * 0.9]], pv, { seed, w: 2.2 });
      R.sk(arc(x - 26, y, 4, 4, 0, TAU, 8), pv, { seed: seed + 1, w: 1.2 });
      R.sk(arc(x + 26, y, 4, 4, 0, TAU, 8), pv, { seed: seed + 2, w: 1.2 });
    };
    sw(X.s1, yL, st.contacts === 1, 7300);
    sw(X.s2, yL, st.contacts === 1, 7310);
    // Monitor: en vertical, con estado opuesto (cerrado cuando la puerta está abierta).
    const mClosed = !st.monitorOpen;
    const ma = mClosed ? 0.04 : 0.5;
    R.sk([[X.mon, yL + 90], [X.mon + 50 * Math.sin(ma), yL + 90 + 50 * Math.cos(ma)]], pv, { seed: 7320, w: 2.2 });
    // Canto de la puerta con ganchos que empujan los interruptores.
    const shift = st.latch * 30 + st.ang * 120;
    const de = this.doorEdge;
    const dx = de.x - shift;
    R.sk([[dx, de.y0 - 30], [dx, de.y1 + 20]], pv, { seed: 7330, w: 3 });
    R.sk([[dx - 18, de.y0 - 30], [dx - 18, de.y1 + 20]], pv, { seed: 7331, w: 1.2, d: 0.6 });
    R.sk([[dx, de.y0 + 10], [X.s1 - shift, de.y0 + 10], [X.s1 - shift, yL + 14]], pv, { seed: 7340, w: 1.8 });
    R.sk([[dx, de.y0 + 50], [X.s2 - shift, de.y0 + 50], [X.s2 - shift, yL + 14]], pv, { seed: 7341, w: 1.8 });
    R.sk([[dx, de.y1 - 10], [X.mon + 40 - shift * 0.3, de.y1 - 10]], pv * clamp(1 - st.ang * 2), { seed: 7342, w: 1.6 });
    R.text(dx - 120, de.y1 + 50, 'canto de la puerta', pv, { size: 16 });
    // Indicador de RF del magnetrón.
    const rx = X.load + 35, ry = yL + 150;
    R.sk(arc(rx, ry, 26, 26, 0, TAU, 20), pv, { seed: 7350, w: 1.8 });
    R.text(rx - 13, ry + 8, 'RF', pv, { size: 18 });
    if (st.rf > 0.02) {
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 900 + k / 3) % 1);
        const rr = 32 + ph * 40;
        R.sk(arc(rx, ry, rr, rr, -0.7, 0.7, 12), 1, { seed: 7360 + k, w: 1.6 * (1 - ph), a: st.rf * pv });
      }
    }
    R.text(rx - 40, ry + 66, st.rf > 0.5 ? 'generando' : 'detenida', pv, { size: 17, ink: st.rf > 0.5 ? 'w' : 'g' });
    // Secuencia numerada durante la apertura.
    if (st.phase === 'opening' || st.phase === 'closing' || st.phase === 'closed') {
      const steps = st.phase === 'opening'
        ? [['1. se libera el pestillo', 0], ['2. se abren los contactos: la RF se detiene', 850], ['3. el monitor queda cerrado', 1300], ['4. recién ahora se separa la puerta', 1900]]
        : [['1. la puerta llega al marco', 0], ['2. los ganchos aprietan los contactos', 1500], ['3. sin RF hasta volver a encender', 2000]];
      steps.forEach(([txt, at], i) => R.text(OV.x0 + 10, OV.y1 + 70 + i * 30, txt, clamp((st.u - at) / 500), { size: 21, ink: i === 1 && st.phase === 'opening' ? 'w' : 'g' }));
    }
  }
}
export { K as DOOR_K, T as DOOR_T };
