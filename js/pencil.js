// Motor de grafito: trazos con presión, hebras, interrupciones y rayado.
import { clamp, noise, noise2, rng, hash, TAU, lerp } from './core.js';

export const INK = {
  g: 'rgb(38,38,44)',
  soft: 'rgb(70,70,74)',
  b: 'rgb(58,112,168)',
  w: 'rgb(204,84,36)',
  paper: 'rgb(243,237,222)',
};

export const LABEL_FONT = '"Noteworthy","Bradley Hand","Segoe Print","Comic Neue","Patrick Hand",cursive';
export const NOTE_FONT = '"Avenir Next","Segoe UI","Helvetica Neue",system-ui,sans-serif';
export const MONO_FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';

let SEED = 1;
export const nextSeed = () => (SEED = (SEED * 48271) % 2147483647);

// ---------- Constructores de recorridos ----------
export const L = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];
export const P = (...pts) => pts;
export const closed = (pts) => [...pts, pts[0]];

export function arc(cx, cy, rx, ry, a0, a1, n = 0, rot = 0) {
  const steps = n || Math.max(8, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / 6));
  const c = Math.cos(rot), s = Math.sin(rot);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

export function bez(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

export function rectPts(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
}

// Curva suave que pasa por los puntos (Catmull-Rom).
export function spline(pts, n = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---------- Trazo ----------
const STRANDS = [
  { off: 0, a: 1, w: 1 },
  { off: 0.55, a: 0.42, w: 0.5 },
  { off: -0.6, a: 0.3, w: 0.42 },
  { off: 1.1, a: 0.16, w: 0.35 },
];

export class Stroke {
  constructor(pts, o = {}) {
    this.ink = o.ink || 'g';
    this.wd = o.w ?? 1.5;
    this.d = o.d ?? 0.86;
    const seed = (this.seed = o.seed ?? nextSeed());
    const h = o.h ?? 2.6;
    const wob = o.wob ?? 0.7;
    const nStr = o.strands ?? 3;
    const taperIn = o.taper ?? 16;
    const dash = o.dash;

    let src = pts.map((p) => [p[0], p[1]]);
    const over = o.over ?? 0;
    if (over && src.length > 1) {
      const a = src[0], b = src[1];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const k = over * (0.5 + hash(seed, 3));
      src.unshift([a[0] - ((b[0] - a[0]) / la) * k, a[1] - ((b[1] - a[1]) / la) * k]);
      const y = src[src.length - 1], z = src[src.length - 2];
      const lb = Math.hypot(y[0] - z[0], y[1] - z[1]) || 1;
      const k2 = over * (0.5 + hash(seed, 5));
      src.push([y[0] + ((y[0] - z[0]) / lb) * k2, y[1] + ((y[1] - z[1]) / lb) * k2]);
    }

    // Longitudes acumuladas y remuestreo uniforme.
    const cum = [0];
    for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]));
    const Ltot = (this.len = cum[cum.length - 1]);
    const n = Math.max(2, Math.ceil(Ltot / h) + 1);
    const X = new Float32Array(n), Y = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = (Ltot * i) / (n - 1);
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const segL = cum[j + 1] - cum[j] || 1;
      const t = (s - cum[j]) / segL;
      X[i] = lerp(src[j][0], src[j + 1][0], t);
      Y[i] = lerp(src[j][1], src[j + 1][1], t);
    }
    // Normales.
    const NX = new Float32Array(n), NY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let dx = X[b] - X[a], dy = Y[b] - Y[a];
      const l = Math.hypot(dx, dy) || 1;
      NX[i] = -dy / l;
      NY[i] = dx / l;
    }
    // Presión a lo largo del recorrido.
    const pr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = (Ltot * i) / (n - 1);
      const tin = clamp(s / taperIn), tout = clamp((Ltot - s) / (taperIn * 1.3));
      const taper = 0.3 + 0.7 * Math.min(tin, tout) ** 0.7;
      let p = taper * (0.66 + 0.34 * noise(seed, s / 60)) * (0.88 + 0.12 * noise(seed + 9, s / 8));
      if (dash) {
        const per = dash[0] + dash[1];
        if (s % per > dash[0]) p = 0;
      }
      pr[i] = clamp(p * (o.press ?? 1));
      // Pulso de la mano: la línea no es una regla.
      const w = wob * noise(seed + 3, s / 70) + wob * 0.25 * noise(seed + 4, s / 17);
      X[i] += NX[i] * w;
      Y[i] += NY[i] * w;
    }
    this.n = n;
    this.strands = [];
    for (let k = 0; k < nStr; k++) {
      const S = STRANDS[k];
      const xs = new Float32Array(n), ys = new Float32Array(n), q = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const s = (Ltot * i) / (n - 1);
        const off = (S.off + 0.35 * noise(seed + 20 + k, s / 24)) * this.wd * 0.55;
        xs[i] = X[i] + NX[i] * off;
        ys[i] = Y[i] + NY[i] * off;
        let p = pr[i] * (0.82 + 0.18 * noise(seed + 30 + k, s / 13));
        const gapN = noise(seed + 50 + k, s / 15);
        if (k === 0 ? gapN > 0.9 && s > 12 && Ltot - s > 12 : gapN > 0.55) p = 0;
        q[i] = p <= 0.02 ? 0 : 1 + Math.min(4, Math.floor(p * 5));
      }
      this.strands.push({ xs, ys, q, a: S.a, w: S.w });
    }
    this.hx = X;
    this.hy = Y;
  }

  // Dibuja el tramo [0, p] del recorrido.
  draw(g, p, o = {}) {
    if (p <= 0) return;
    const n = this.n;
    const end = clamp(p) * (n - 1);
    const m = Math.floor(end);
    const fr = end - m;
    const k = o.k ?? 1;
    const alpha = (o.a ?? 1) * this.d;
    if (alpha <= 0.003) return;
    g.strokeStyle = INK[o.ink || this.ink];
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const last = Math.min(n - 2, m + (fr > 0 ? 0 : -1));
    for (const st of this.strands) {
      const { xs, ys, q } = st;
      // Una sola pasada: cada nivel de presión acumula su propio recorrido.
      const paths = [null, null, null, null, null, null];
      let prev = -1;
      for (let i = 0; i <= last; i++) {
        const lev = q[i];
        if (!lev) { prev = -1; continue; }
        let pth = paths[lev];
        if (!pth) pth = paths[lev] = new Path2D();
        if (prev !== lev) pth.moveTo(xs[i], ys[i]);
        if (i === m) pth.lineTo(lerp(xs[i], xs[i + 1], fr), lerp(ys[i], ys[i + 1], fr));
        else pth.lineTo(xs[i + 1], ys[i + 1]);
        prev = lev;
      }
      for (let lev = 1; lev <= 5; lev++) {
        if (!paths[lev]) continue;
        const f = lev / 5;
        g.globalAlpha = clamp(alpha * st.a * (0.25 + 0.75 * f));
        g.lineWidth = this.wd * st.w * (0.5 + 0.5 * f) * k;
        g.stroke(paths[lev]);
      }
    }
    g.globalAlpha = 1;
  }

  // Punto donde está la mina en el progreso p.
  tip(p) {
    const i = clamp(p) * (this.n - 1);
    const a = Math.floor(i), b = Math.min(this.n - 1, a + 1);
    return [lerp(this.hx[a], this.hx[b], i - a), lerp(this.hy[a], this.hy[b], i - a)];
  }
}

export const S = (pts, o) => new Stroke(pts, o);

// Revela una lista en orden, con solapamiento: monótono en p.
export function seq(g, list, p, o = {}, ov = 0.45) {
  const N = list.length;
  if (!N || p <= 0) return;
  const step = 1 - ov;
  const total = (N - 1) * step + 1;
  for (let i = 0; i < N; i++) {
    const lp = clamp(p * total - i * step);
    if (lp > 0) list[i].draw(g, lp, o);
  }
}

// ---------- Rayado que sigue el volumen ----------
// lineFn(u, r) devuelve la polilínea de la raya número u ∈ [0,1].
export function hatch(n, lineFn, o = {}) {
  const r = rng(o.seed ?? nextSeed());
  const out = [];
  for (let i = 0; i < n; i++) {
    let u = (i + 0.5 + (r() - 0.5) * 0.5) / n;
    if (o.dist) u = o.dist(u);
    const pts = lineFn(u, r);
    if (!pts || pts.length < 2) continue;
    const t0 = r() * (o.trim ?? 0.08), t1 = 1 - r() * (o.trim ?? 0.1);
    out.push(new Stroke(trimPts(pts, t0, t1), {
      w: o.w ?? 0.9, d: (o.d ?? 0.42) * (0.75 + r() * 0.35), strands: o.strands ?? 2,
      wob: o.wob ?? 0.25, taper: 8, ink: o.ink, h: o.h ?? 3,
    }));
  }
  return out;
}

export function trimPts(pts, t0, t1) {
  if (pts.length === 2) {
    const [a, b] = pts;
    return [[lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)]];
  }
  const i0 = Math.floor(t0 * (pts.length - 1)), i1 = Math.ceil(t1 * (pts.length - 1));
  return pts.slice(i0, i1 + 1);
}

// Rayas entre dos bordes opuestos de un cuadrilátero: siguen su perspectiva.
export function hatchQuad(a, b, c, d, n, o = {}) {
  return hatch(n, (u) => [
    [lerp(a[0], b[0], u), lerp(a[1], b[1], u)],
    [lerp(d[0], c[0], u), lerp(d[1], c[1], u)],
  ], o);
}

// ---------- Trazos inmediatos para elementos animados ----------
const cache = new Map();
// Un trazo efímero con forma cambiante: la semilla fija evita parpadeo.
export function sketch(g, pts, p, o = {}) {
  if (pts.length < 2) return;
  const st = new Stroke(pts, { ...o, seed: o.seed ?? 77, h: o.h ?? 3.2, strands: o.strands ?? 2 });
  st.draw(g, p, o);
  return st;
}

// Trazo memorizado por clave (forma fija, se construye una vez).
export function memo(key, build) {
  let v = cache.get(key);
  if (!v) { v = build(); cache.set(key, v); }
  return v;
}

// ---------- Texto manuscrito ----------
export function writeText(g, text, x, y, p, o = {}) {
  if (p <= 0) return 0;
  const size = o.size ?? 16;
  g.save();
  g.font = `${o.weight ?? 400} ${size}px ${o.font ?? LABEL_FONT}`;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const lines = Array.isArray(text) ? text : [text];
  const lh = size * (o.lh ?? 1.25);
  const widths = lines.map((l) => g.measureText(l).width);
  const maxW = Math.max(...widths);
  let ox = x;
  if (o.align === 'right') ox = x - maxW;
  if (o.align === 'center') ox = x - maxW / 2;
  const total = widths.reduce((s, w) => s + w, 0) || 1;
  let budget = clamp(p) * total;
  g.fillStyle = INK[o.ink || 'g'];
  g.globalAlpha = o.a ?? 0.9;
  for (let i = 0; i < lines.length; i++) {
    if (budget <= 0) break;
    const w = widths[i];
    const lx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : ox;
    const ly = y + i * lh;
    const vis = Math.min(w, budget);
    budget -= w;
    g.save();
    g.beginPath();
    g.rect(lx - 2, ly - size * 1.2, vis + 2, size * 1.7);
    g.clip();
    g.fillText(lines[i], lx, ly);
    g.restore();
  }
  g.restore();
  return maxW;
}

// ---------- Papel ----------
export function makePaper(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  // Fondo marfil con manchas suaves y viñeta, calculado en baja resolución
  // (evita el tramado que producen los degradados superpuestos).
  const sw = Math.ceil(w / 6), shh = Math.ceil(h / 6);
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = shh;
  const sg = small.getContext('2d');
  const img = sg.createImageData(sw, shh);
  for (let y = 0; y < shh; y++) {
    for (let x = 0; x < sw; x++) {
      const X = x * 6, Y = y * 6;
      const m = noise2(11, X / 260, Y / 260) * 0.6 + noise2(12, X / 90, Y / 90) * 0.4;
      const dx = (X - w / 2) / (w * 0.75), dy = (Y - h / 2) / (h * 0.75);
      const vig = Math.max(0, Math.hypot(dx, dy) - 0.45) * 0.09;
      const k = (m - 0.5) * 0.035 + vig;
      const i = (y * sw + x) * 4;
      img.data[i] = 242 - k * 160;
      img.data[i + 1] = 236 - k * 175;
      img.data[i + 2] = 219 - k * 200;
      img.data[i + 3] = 255;
    }
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, w, h);
  const r = rng(20251002);
  // Fibras.
  g.lineWidth = 0.5;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = r() * w, y = r() * h, a = r() * TAU, l = 3 + r() * 10;
    g.strokeStyle = r() < 0.6 ? 'rgba(120,100,70,0.07)' : 'rgba(255,255,250,0.22)';
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 2, y + Math.sin(a) * l * 0.5 + r() * 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // Motas.
  for (let i = 0; i < (w * h) / 260; i++) {
    g.fillStyle = `rgba(90,80,60,${0.03 + r() * 0.07})`;
    g.fillRect(r() * w, r() * h, 0.7 + r() * 0.8, 0.7 + r() * 0.8);
  }
  return c;
}

// Diente del papel: donde el grafito no llega a depositarse.
export function makeTooth() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = rng(9091);
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const x = i % 256, y = (i / 256) | 0;
    const ridge = Math.sin(x * 0.9 + Math.sin(y * 0.21) * 2) * 0.5 + 0.5;
    const v = r();
    const a = v > 0.62 ? (v - 0.62) * 2.2 * (0.6 + 0.4 * ridge) : 0;
    img.data[i * 4 + 3] = Math.round(clamp(a) * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}
