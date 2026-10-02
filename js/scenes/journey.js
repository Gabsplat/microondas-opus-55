// 03 / EL VIAJE INVISIBLE — antena → guía de ondas → dentro de la cavidad (otro dibujo).
import { E, seg, clamp, lerp, lerpRect, rect, TAU, travel } from '../core.js';
import { S, arc, hatch, hatchQuad, rectPts, spline, MONO_FONT } from '../pencil.js';
import { Scene } from '../scene.js';
import { fieldI, quadMap } from './field.js';

// Mundo exterior: corte lateral del horno.
const CAV = { x0: 200, y0: 300, x1: 900, y1: 800, th: 16 };
const GUIDE = { x0: 900, x1: 1240, y0: 330, y1: 390, th: 12 };
const MAG = rect(1150, 418, 140, 170);
const ANT = [1205, 352];
// Boca de la guía: dentro de ella vive el dibujo del interior (1600×1000).
const PR = rect(905, 351, 24, 15);

const K = {
  overview: rect(110, 140, 1320, 760),
  antenna: rect(1065, 270, 290, 180),
  guide: rect(870, 280, 250, 156),
  port: PR,
};

const T = {
  guides: [0, 800],
  walls: [800, 1700],
  guideDraw: [1900, 1000],
  mag: [2600, 1300],
  inside: [3500, 900],
  toAntenna: [4600, 1500],
  field: [5400, 8000],
  alongGuide: [6300, 2700],
  dip: [9000, 350],
  dive: [9350, 2300],
  room: [7600, 2600],
  waves: [12600, 5600],
  pattern: [16200, 4200],
  probe: [20600, 900],
};

// Cuarto en perspectiva visto desde la boca de la guía.
const NEAR = [[60, 60], [1540, 60], [1540, 950], [60, 950]];
const FAR = [[610, 190], [990, 190], [990, 430], [610, 430]];
const floor = quadMap(NEAR[3], NEAR[2], FAR[2], FAR[3]);

export class JourneyScene extends Scene {
  constructor() {
    super();
    this.num = '03';
    this.short = 'El viaje';
    this.kicker = 'El viaje invisible';
    this.title = 'Por el tubo, hasta la caja de metal';
    this.alt = 'Corte lateral del horno: la cámara entra por la antena del magnetrón, recorre la guía de ondas y atraviesa su boca para aparecer dentro de la cavidad, donde las ondas se reflejan y forman un patrón de zonas fuertes y débiles en el piso.';
    this.scope = 'Ilustración conceptual. El patrón de campo es cualitativo, no una simulación electromagnética. La onda se muestra en tiempo didáctico.';
    this.dur = 21600;
    this.phases = [0, 800, 4600, 12600];
    this.loop = true;
    this.probe = [0.5, 0.55];
    this.enterMode = 'in';
    this.notes = {
      intro: '<p>Un corte de costado: el <strong>magnetrón</strong> está afuera de la caja donde va la comida. Su antena asoma dentro de un tubo de metal.</p>',
      guide: '<p>Dentro de la <strong>guía de ondas</strong>, el campo eléctrico crece, se invierte y avanza a lo largo del tubo. No es una fila de bolitas: el campo oscila en todo el espacio a la vez.</p>',
      dive: '<p>La guía termina en una boca abierta en la pared de la cavidad. Pasemos por ella…</p>',
      inside: '<p>Estás dentro de la <strong>cavidad</strong>. Las paredes de metal reflejan la onda: rebota una y otra vez, y las ondas que van se cruzan con las que vuelven.</p>',
      pattern: '<p>Donde las ondas se suman, el campo es <strong>fuerte</strong>; donde se cancelan, es <strong>débil</strong>. Ese patrón queda casi quieto. Por eso, en un mismo horno, la comida calienta distinto según dónde esté.</p>',
      rest: '<p>Arrastrá la taza por el piso (o usá los controles) y mirá el indicador: en algunas zonas el campo es fuerte; en otras, débil.</p>',
    };
    this.defs = [
      ['Guía de ondas', 'tubo de metal de sección rectangular que conduce la onda de radio del magnetrón a la cavidad.'],
      ['Reflexión', 'la onda rebota al chocar con el metal, como la luz en un espejo.'],
      ['Onda estacionaria', 'resultado de ondas que van y vuelven: zonas fuertes y débiles que no se desplazan.'],
      ['Longitud de onda', 'distancia entre dos crestas: unos 12,2 cm a 2,45 GHz. Dos zonas fuertes vecinas suelen estar a unos 6 cm.'],
    ];
  }

  resetState() { this.probe = [0.5, 0.55]; }

  build() {
    const { x0, y0, x1, y1, th } = CAV;
    // Paredes de la cavidad en corte (doble línea + rayado de sección a 45°).
    const wall = (pts) => S(pts, { w: 2, over: 3 });
    this.walls = [
      wall([[x1, GUIDE.y0], [x1, y0], [x0, y0], [x0, y1], [x1, y1], [x1, GUIDE.y1]]),
      wall([[x1 - th, GUIDE.y0], [x1 - th, y0 + th], [x0 + th, y0 + th], [x0 + th, y1 - th], [x1 - th, y1 - th], [x1 - th, GUIDE.y1]]),
    ];
    const sec = [];
    const band = (ax, ay, bx, by, n) => sec.push(...hatch(n, (u) => {
      const x = lerp(ax, bx, u), y = lerp(ay, by, u);
      return [[x - 7, y + 7], [x + 7, y - 7]];
    }, { d: 0.5, w: 0.9, trim: 0.02 }));
    band(x0 + 8, y0 + 8, x1 - 8, y0 + 8, 60);
    band(x0 + 8, y1 - 8, x1 - 8, y1 - 8, 60);
    band(x0 + 8, y0 + 8, x0 + 8, y1 - 8, 44);
    band(x1 - 8, y0 + 8, x1 - 8, GUIDE.y0 - 4, 3);
    band(x1 - 8, GUIDE.y1 + 4, x1 - 8, y1 - 8, 36);
    this.wallHatch = sec;
    // Guía de ondas.
    const g = GUIDE;
    this.guide = [
      S([[g.x0, g.y0], [g.x1, g.y0], [g.x1, g.y1], [g.x0 + 0, g.y1]], { w: 2 }),
      S([[g.x0 - th, g.y0 - g.th], [g.x1 + g.th, g.y0 - g.th], [g.x1 + g.th, g.y1 + g.th], [MAG.x + MAG.w * 0.25, g.y1 + g.th]], { w: 1.5 }),
      S([[MAG.x + MAG.w * 0.75, g.y1 + g.th], [g.x0 - th, g.y1 + g.th]], { w: 1.5 }),
    ];
    this.guideHatch = hatchQuad([g.x0, g.y0 - g.th], [g.x1, g.y0 - g.th], [g.x1, g.y0], [g.x0, g.y0], 40, { d: 0.35 });
    // Magnetrón: cuerpo, aletas, imanes y antena.
    const m = MAG;
    this.mag = [
      S(rectPts(m.x, m.y + 30, m.w, m.h - 60), { w: 1.9 }),
      S(rectPts(m.x + 20, m.y, m.w - 40, 30), { w: 1.4 }),
      S(rectPts(m.x + 20, m.y + m.h - 30, m.w - 40, 30), { w: 1.4 }),
      S([[ANT[0], m.y], [ANT[0], ANT[1] + 10]], { w: 3 }),
      S(arc(ANT[0], ANT[1] + 8, 10, 12, Math.PI, TAU), { w: 2 }),
    ];
    for (let y = m.y + 44; y < m.y + m.h - 40; y += 10) this.mag.push(S([[m.x - 14, y], [m.x + m.w + 14, y]], { w: 0.8, d: 0.55 }));
    this.magHatch = [
      ...hatchQuad([m.x + 20, m.y], [m.x + 20, m.y + 30], [m.x + m.w - 20, m.y + 30], [m.x + m.w - 20, m.y], 12, { d: 0.4 }),
      ...hatchQuad([m.x + 20, m.y + m.h - 30], [m.x + 20, m.y + m.h], [m.x + m.w - 20, m.y + m.h], [m.x + m.w - 20, m.y + m.h - 30], 12, { d: 0.4 }),
    ];
    // Interior del corte: plato y comida, puerta a la izquierda.
    this.inside = [
      S([[x0 + 120, y1 - 70], [x1 - 120, y1 - 70]], { w: 1.6 }),
      S(spline([[x0 + 260, y1 - 70], [x0 + 300, y1 - 120], [x0 + 380, y1 - 128], [x0 + 440, y1 - 110], [x0 + 470, y1 - 70]], 8), { w: 1.5 }),
      S([[(x0 + x1) / 2, y1 - 70], [(x0 + x1) / 2, y1 - th]], { w: 1.2, d: 0.6 }),
    ];
    this.foodHatch = hatch(8, (u) => [[x0 + 290 + u * 160, y1 - 74], [x0 + 300 + u * 140, y1 - 112 + Math.abs(u - 0.5) * 30]], { d: 0.35 });
    this.guides = [
      S([[60, GUIDE.y0 + 30], [1500, GUIDE.y0 + 30]], { ink: 'b', w: 0.9, d: 0.4, dash: [6, 8] }),
      S([[ANT[0], 120], [ANT[0], 900]], { ink: 'b', w: 0.9, d: 0.35, dash: [6, 8] }),
    ];

    // ----- Mundo interior (1600×1000) -----
    const N = NEAR, F = FAR;
    this.room = [
      S([...F, F[0]], { w: 2.2 }),
      ...N.map((p, i) => S([p, F[i]], { w: 1.8, over: 4 })),
    ];
    // Metal: rayado vertical en las paredes laterales, que converge con la perspectiva.
    const wallH = (a, b, c, d, n) => hatchQuad(a, b, c, d, n, { d: 0.3, w: 1, dist: (u) => Math.pow(u, 1.25) });
    this.roomHatch = [
      ...wallH(N[0], F[0], F[3], N[3], 26),
      ...wallH(N[1], F[1], F[2], N[2], 26),
      ...hatchQuad(F[0], F[1], F[2], F[3], 14, { d: 0.16, w: 0.9 }),
      ...hatchQuad(N[0], N[1], F[1], F[0], 10, { d: 0.12, w: 0.9, dist: (u) => u * u }),
    ];
    // Plato en el piso.
    const plate = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * TAU;
      plate.push(floor(0.5 + Math.cos(a) * 0.28, 0.52 + Math.sin(a) * 0.3));
    }
    this.plate = [S(plate, { w: 1.6, over: 0 })];
    // Patrón del campo sobre el piso: rayas siguiendo el plano, densas donde el campo es fuerte.
    this.pattern = [];
    const rows = 44;
    for (let k = 0; k < rows; k++) {
      const v = (k + 0.5) / rows;
      let run = [];
      const flush = () => {
        if (run.length > 2) this.pattern.push({ v, s: S(run.map(([u, vv]) => floor(u, vv)), { w: 2.2, d: 0.78, strands: 3, wob: 0.5, taper: 6 }) });
        run = [];
      };
      for (let i = 0; i <= 140; i++) {
        const u = i / 140;
        if (fieldI(u, v) > 0.42) run.push([u, v]);
        else flush();
      }
      flush();
    }
    this.pattern2 = [];
    const cols = 52;
    for (let k = 0; k < cols; k++) {
      const u = (k + 0.5) / cols;
      let run = [];
      const flush = () => {
        if (run.length > 2) this.pattern2.push({ v: run[0][1], s: S(run.map(([uu, v]) => floor(uu, v)), { w: 1.9, d: 0.7, strands: 3, wob: 0.5, taper: 6 }) });
        run = [];
      };
      for (let i = 0; i <= 120; i++) {
        const v = i / 120;
        if (fieldI(u, v) > 0.72) run.push([u, v]);
        else flush();
      }
      flush();
    }
    this.pattern.sort((a, b) => a.v - b.v);
    this.pattern2.sort((a, b) => a.v - b.v);
    // Puntos fuertes y débiles para las etiquetas.
    let best = [0, 0, -1], low = [0, 0, 2];
    for (let i = 4; i < 36; i++) for (let j = 4; j < 36; j++) {
      const u = i / 40, v = j / 40, f = fieldI(u, v);
      if (f > best[2] && v > 0.3 && v < 0.8) best = [u, v, f];
      if (f < low[2] && v > 0.25 && v < 0.6 && u > 0.2 && u < 0.8) low = [u, v, f];
    }
    this.hot = best;
    this.cold = low;
  }

  camera(t) {
    const a = seg(t, ...T.toAntenna), b = seg(t, ...T.alongGuide), d = seg(t, ...T.dive);
    if (t < T.toAntenna[0]) return K.overview;
    if (t < T.alongGuide[0]) return lerpRect(K.overview, K.antenna, E.inOut(a), 0.05);
    if (t < T.dip[0]) return lerpRect(K.antenna, K.guide, E.inOut(b));
    if (t < T.dive[0]) {
      // Anticipación: un respiro hacia atrás antes de zambullirse.
      const u = Math.sin(seg(t, ...T.dip) * Math.PI) * 0.06;
      const r = K.guide;
      return { x: r.x - r.w * u / 2, y: r.y - r.h * u / 2, w: r.w * (1 + u), h: r.h * (1 + u) };
    }
    // Zambullida: lenta al principio, rápida en el medio, asentamiento largo.
    return lerpRect(K.guide, K.port, E.inOut(d));
  }

  noteKey(t) {
    if (t < T.toAntenna[0] + 900) return 'intro';
    if (t < T.dip[0]) return 'guide';
    if (t < T.dive[0] + 1800) return 'dive';
    if (t < T.pattern[0]) return 'inside';
    if (t < this.dur) return 'pattern';
    return 'rest';
  }

  exitPoint() {
    const c = floor(0.5, 0.52);
    return [PR.x + (c[0] / 1600) * PR.w, PR.y + (c[1] / 1000) * PR.h];
  }

  controls() {
    return `<p class="group-label">Muestra en el piso</p>
      <label class="range">Izquierda ↔ derecha<input type="range" min="0.06" max="0.94" step="0.01" value="${this.probe[0]}" data-axis="0"></label>
      <label class="range">Cerca ↔ fondo<input type="range" min="0.08" max="0.92" step="0.01" value="${this.probe[1]}" data-axis="1"></label>
      <p class="status-chip" data-probe>Campo en la muestra: <b>—</b></p>`;
  }
  bind(box, app) {
    box.addEventListener('input', (e) => {
      const r = e.target.closest('[data-axis]');
      if (!r) return;
      this.probe[+r.dataset.axis] = +r.value;
      if (this.t < this.dur) this.t = this.dur;
      app.wake();
    });
  }
  syncControls(box) {
    const f = fieldI(...this.probe);
    const b = box.querySelector('[data-probe] b');
    if (b) b.textContent = f > 0.6 ? 'fuerte' : f > 0.3 ? 'medio' : 'débil';
    box.querySelectorAll('[data-axis]').forEach((r) => {
      if (document.activeElement !== r) r.value = this.probe[+r.dataset.axis];
    });
  }
  onDrag(id, [wx, wy]) {
    if (id !== 'probe') return;
    // Mundo exterior → interior → piso.
    const ix = ((wx - PR.x) / PR.w) * 1600, iy = ((wy - PR.y) / PR.h) * 1000;
    const [u, v] = floor.inv(ix, iy);
    this.probe = [clamp(u, 0.06, 0.94), clamp(v, 0.08, 0.92)];
    if (this.t < this.dur) this.t = this.dur;
  }

  draw(R) {
    const t = R.t;
    // El dibujo exterior se retira cuando la escala crece: entramos en otro dibujo.
    const deep = clamp((130 - R.vw / R.s) / 80);
    const out = 1 - deep;
    if (out > 0.01) {
      const a = out;
      R.seq(this.guides, seg(t, ...T.guides), { a: a * 0.8 }, 0.4);
      R.seq(this.walls, E.draw(seg(t, ...T.walls)), { a }, 0.3);
      R.seq(this.wallHatch, seg(t, T.walls[0] + 600, 1600), { a }, 0.8);
      R.seq(this.guide, E.draw(seg(t, ...T.guideDraw)), { a }, 0.3);
      R.seq(this.guideHatch, seg(t, T.guideDraw[0] + 500, 900), { a }, 0.7);
      R.seq(this.mag, E.draw(seg(t, ...T.mag)), { a }, 0.35);
      R.seq(this.magHatch, seg(t, T.mag[0] + 700, 700), { a }, 0.6);
      R.seq(this.inside, E.draw(seg(t, ...T.inside)), { a }, 0.4);
      R.seq(this.foodHatch, seg(t, T.inside[0] + 500, 600), { a }, 0.6);
      const lab = seg(t, 3800, 700) * (1 - seg(t, T.toAntenna[0], 600));
      R.label(MAG.x + MAG.w, MAG.y + 100, 'magnetrón', lab, { dx: 50, dy: 30 });
      R.label((GUIDE.x0 + GUIDE.x1) / 2, GUIDE.y0 - 14, 'guía de ondas', seg(t, 3000, 700) * (1 - seg(t, T.toAntenna[0], 600)), { dx: 20, dy: -60 });
      R.label(CAV.x0 + 160, CAV.y0 + 150, 'cavidad (caja de metal)', seg(t, 2400, 700) * (1 - seg(t, T.toAntenna[0], 600)), { dx: 30, dy: -40 });
      R.label(CAV.x0 + 8, CAV.y0 + 250, 'puerta', seg(t, 2800, 700) * (1 - seg(t, T.toAntenna[0], 600)), { dx: -40, dy: -30 });
      // Campo en la guía.
      const pf = seg(t, T.field[0], 900);
      if (pf > 0) this.drawGuideField(R, t, pf * a);
      R.label(ANT[0], ANT[1] + 6, 'antena', seg(t, T.toAntenna[0] + 900, 600) * (1 - seg(t, T.alongGuide[0] + 600, 500)), { dx: 40, dy: 50, size: 16 });
      R.label(GUIDE.x0 + 4, (GUIDE.y0 + GUIDE.y1) / 2, 'boca', seg(t, T.alongGuide[0] + 1700, 600) * (1 - seg(t, T.dive[0] + 300, 400)), { dx: -26, dy: -46, size: 16 });
    }
    // El interior siempre vive en la boca de la guía; aparece cuando nos acercamos.
    const roomT = t - T.room[0];
    const fr = seg(t, T.room[0] - 600, 700);
    if (fr > 0 && out > 0.01) {
      R.sk(rectPts(PR.x - 0.6, PR.y - 0.6, PR.w + 1.2, PR.h + 1.2), E.draw(fr), { seed: 4500, w: 0.9, a: out });
      R.text(PR.x, PR.y - 2.2, 'detalle: adentro', fr * (1 - seg(t, T.dive[0] + 400, 500)), { size: 2.6, font: MONO_FONT, ink: 'b', a: 0.8 });
    }
    if (t > T.room[0] - 400) {
      R.erase(rectPts(PR.x, PR.y, PR.w, PR.h), clamp((t - T.room[0] + 400) / 600));
      R.nest(PR, 1600, 1000, () => this.drawRoom(R, t, roomT), { clip: true });
    }
  }

  drawGuideField(R, t, a) {
    // Modo dominante de la guía: campo vertical cuya intensidad varía a lo largo del tubo
    // y avanza hacia la cavidad (tiempo didáctico).
    const tt = (t - T.field[0]) / 1000;
    const g = GUIDE;
    const lam = 120;
    for (let x = g.x0 + 6; x < g.x1 - 4; x += 7) {
      const ph = ((x - g.x1) / lam) * TAU + tt * 2.4;
      const v = Math.sin(ph);
      const amp = Math.abs(v);
      if (amp < 0.12) continue;
      const mid = (g.y0 + g.y1) / 2;
      const h = (g.y1 - g.y0 - 8) / 2 * amp;
      const near = clamp(1 - Math.abs(x - ANT[0]) / 30);
      R.sk([[x, mid - h], [x, mid + h]], 1, { seed: 2000 + ((x * 7) | 0), w: 0.5 + amp * 1.1, d: 0.75, a: a * (0.4 + 0.6 * amp) * (1 - near * 0.5) });
      // Sentido del campo: pequeña punta arriba o abajo.
      if (amp > 0.7 && ((x - g.x0) | 0) % 21 < 7) {
        const s = v > 0 ? -1 : 1;
        R.sk([[x - 3, mid + s * (h - 5)], [x, mid + s * h], [x + 3, mid + s * (h - 5)]], 1, { seed: 2500 + ((x * 3) | 0), w: 0.9, a: a * 0.8 });
      }
    }
  }

  drawRoom(R, t, rt) {
    const P = (a, d) => E.draw(clamp((rt - a) / d));
    R.seq(this.room, P(0, 1600), {}, 0.3);
    R.seq(this.roomHatch, P(900, 1800), {}, 0.75);
    R.seq(this.plate, P(1500, 800), { a: 0.75 }, 0.3);
    R.label(1420, 520, 'pared de metal: refleja', clamp((rt - 2200) / 700), { dx: -60, dy: -150, size: 18 });

    // Ondas: frentes que se expanden desde la boca y sus reflejos en las paredes.
    const wt = (t - T.waves[0]) / 1000;
    const fade = 1 - seg(t, T.pattern[0] + 800, 2600);
    if (wt > 0 && fade > 0) {
      const src = [[0.5, -0.04], [-0.5, -0.04], [1.5, -0.04], [0.5, 2.04], [-0.5, 2.04], [1.5, 2.04]];
      const speed = 0.32;
      src.forEach(([sx, sy], si) => {
        for (let f = 0; f < 4; f++) {
          const r = wt * speed - f * 0.16;
          if (r <= 0.02) continue;
          const pts = [];
          const runs = [];
          for (let i = 0; i <= 120; i++) {
            const a = (i / 120) * TAU;
            const u = sx + Math.cos(a) * r, v = sy + Math.sin(a) * r * 0.92;
            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) pts.push(floor(u, v));
            else if (pts.length) { runs.push(pts.splice(0)); }
          }
          if (pts.length) runs.push(pts);
          const life = clamp(1.4 - r / 1.6);
          for (const run of runs) if (run.length > 2) R.sk(run, 1, { seed: 3000 + si * 10 + f, w: 1.6, d: 0.7, a: fade * life * (si ? 0.65 : 1) });
        }
      });
      R.label(800, 860, 'frente de onda que avanza', clamp((t - T.waves[0] - 800) / 700) * fade, { dx: 120, dy: 50, size: 17 });
      R.label(floor(0.05, 0.6)[0], floor(0.05, 0.6)[1], 'reflejo', clamp((t - T.waves[0] - 3200) / 700) * fade, { dx: 60, dy: -110, size: 17 });
    }
    // Patrón estacionario sobre el piso.
    const pp = seg(t, ...T.pattern);
    if (pp > 0) {
      R.seq(this.pattern.map((q) => q.s), E.inOut(pp), { a: 0.95 }, 0.85);
      R.seq(this.pattern2.map((q) => q.s), E.inOut(clamp(pp * 1.3 - 0.3)), { a: 0.9 }, 0.85);
      const hp = floor(this.hot[0], this.hot[1]);
      const cp = floor(this.cold[0], this.cold[1]);
      R.label(hp[0], hp[1], 'zona fuerte', clamp((t - T.pattern[0] - 2400) / 700), { dx: 70, dy: -80 });
      R.label(cp[0], cp[1], 'zona débil', clamp((t - T.pattern[0] - 3000) / 700), { dx: -70, dy: -90 });
      // Cota entre dos zonas fuertes vecinas.
      const pd = clamp((t - T.pattern[0] - 3400) / 900);
      if (pd > 0) {
        const v = 0.125;
        const a = floor(0.1, v), b = floor(0.3, v);
        R.sk([[a[0], a[1] + 30], [b[0], b[1] + 30]], E.draw(pd), { seed: 3900, ink: 'b', w: 1.2 });
        R.sk([[a[0], a[1] + 18], [a[0], a[1] + 42]], pd, { seed: 3901, ink: 'b', w: 1 });
        R.sk([[b[0], b[1] + 18], [b[0], b[1] + 42]], pd, { seed: 3902, ink: 'b', w: 1 });
        R.text((a[0] + b[0]) / 2 - 40, a[1] + 66, '≈ 6 cm', pd, { size: 24, ink: 'b' });
      }
      R.text(70, 990, 'patrón cualitativo · no es una simulación', seg(t, T.pattern[0] + 1500, 1200), { size: 20, font: MONO_FONT, ink: 'b', a: 0.75 });
    }
    // Muestra arrastrable e indicador.
    const pr = seg(t, ...T.probe);
    if (pr > 0) this.drawProbe(R, pr);
  }

  drawProbe(R, pr) {
    const [u, v] = this.probe;
    const c = floor(u, v);
    const sc = 0.5 + v * -0.2 + 0.25; // más chica al fondo
    const w = 60 * sc * (1.25 - v * 0.6), h = 50 * sc * (1.25 - v * 0.6);
    R.erase(rectPts(c[0] - w / 2, c[1] - h, w, h), pr);
    R.sk(arc(c[0], c[1] - h, w / 2, w / 7, 0, TAU, 24), pr, { seed: 4000, w: 1.6 });
    R.sk([[c[0] - w / 2, c[1] - h], [c[0] - w / 2 + 4, c[1]], [c[0] + w / 2 - 4, c[1]], [c[0] + w / 2, c[1] - h]], pr, { seed: 4001, w: 1.6 });
    R.sk(arc(c[0] + w / 2 + 4, c[1] - h * 0.55, w / 5, h / 4, -1.6, 1.6, 12), pr, { seed: 4002, w: 1.3 });
    const f = fieldI(u, v);
    if (f > 0.3) R.glow(c[0], c[1] - h * 0.5, w * 0.9, f * pr);
    R.hit('probe', [[c[0] - w, c[1] - h * 1.6], [c[0] + w, c[1] - h * 1.6], [c[0] + w, c[1] + 16], [c[0] - w, c[1] + 16]], { drag: true });
    // Indicador de aguja (cualitativo).
    const gx = 300, gy = 210, rr = 110;
    R.sk(arc(gx, gy, rr, rr, Math.PI, TAU, 30), pr, { seed: 4010, w: 1.6 });
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      R.sk([[gx + Math.cos(a) * (rr - 12), gy + Math.sin(a) * (rr - 12)], [gx + Math.cos(a) * rr, gy + Math.sin(a) * rr]], pr, { seed: 4020 + i, w: 1.2 });
    }
    this.needle = this.needle ?? f;
    this.needle += (f - this.needle) * 0.18;
    const na = Math.PI + this.needle * Math.PI;
    R.sk([[gx, gy], [gx + Math.cos(na) * (rr - 18), gy + Math.sin(na) * (rr - 18)]], pr, { seed: 4030, w: 2.4 });
    R.text(gx - rr - 10, gy + 34, 'débil', pr, { size: 22 });
    R.text(gx + rr - 50, gy + 34, 'fuerte', pr, { size: 22, ink: 'w' });
    R.text(gx - 95, gy + 70, 'campo en la taza', pr, { size: 20, font: MONO_FONT, ink: 'b' });
  }

  busy() { return this.needle !== undefined && Math.abs(fieldI(...this.probe) - this.needle) > 0.01; }
}
export { T as JOURNEY_T };
