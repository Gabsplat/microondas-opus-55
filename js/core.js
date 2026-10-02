// Utilidades deterministas: azar con semilla, ruido suave, easing y proyección.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, start, dur) => clamp((t - start) / dur);
export const smooth = (t) => t * t * (3 - 2 * t);

// Curvas de progreso. Las de trazado son monótonas: una línea nunca retrocede.
export const E = {
  lin: (t) => t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t,
  // Trazo de lápiz: arranca con decisión, se demora en las curvas y asienta.
  draw: (t) => 0.82 * (-(Math.cos(Math.PI * t) - 1) / 2) + 0.18 * t,
  // Sólo para movimiento (no para trazado): leve sobrepaso y asentamiento.
  settle: (t, s = 0.9) => {
    const c3 = s + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
  // Anticipación: retrocede apenas antes de partir.
  anticip: (t, s = 1.1) => {
    const c3 = s + 1;
    return c3 * t * t * t - s * t * t;
  },
};

// Anticipación → aceleración → asentamiento, para objetos que viajan.
export function travel(t, a = 0.16, s = 0.7) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < a) return -0.035 * Math.sin((t / a) * Math.PI);
  const u = (t - a) / (1 - a);
  return E.settle(u, s);
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(i, seed = 0) {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Ruido de valor 1D suave en [-1, 1].
export function noise(seed, x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * smooth(f);
}

export function noise2(seed, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const h = (i, j) => hash(i * 7919 + j * 104729, seed);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
}

// Proyección caballera: el frente conserva su forma; la profundidad sube a la derecha.
export const DEPTH = [0.4, -0.3];
export function cab(x, y, z, ox = 0, oy = 0) {
  return [ox + x + z * DEPTH[0], oy - y + z * DEPTH[1]];
}

// Interpolación de encuadres en escala logarítmica, con un arco suave.
export function lerpRect(a, b, t, arc = 0) {
  const wa = Math.log(a.w), wb = Math.log(b.w);
  const w = Math.exp(lerp(wa, wb, t));
  const h = w * lerp(a.h / a.w, b.h / b.w, t);
  const ca = [a.x + a.w / 2, a.y + a.h / 2];
  const cb = [b.x + b.w / 2, b.y + b.h / 2];
  let cx = lerp(ca[0], cb[0], t);
  let cy = lerp(ca[1], cb[1], t);
  if (arc) {
    const dx = cb[0] - ca[0], dy = cb[1] - ca[1];
    const bend = Math.sin(Math.PI * t) * arc;
    cx += -dy * bend;
    cy += dx * bend;
  }
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export const rect = (x, y, w, h) => ({ x, y, w, h });

export function bboxOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function pad(r, p, py = p) {
  return { x: r.x - p, y: r.y - py, w: r.w + p * 2, h: r.h + py * 2 };
}

// Línea de tiempo con nombres: cada clave es [inicio, duración].
export class Cues {
  constructor(map) {
    this.c = map;
    this.end = Math.max(...Object.values(map).map(([s, d]) => s + d));
  }
  start(n) { return this.c[n][0]; }
  stop(n) { return this.c[n][0] + this.c[n][1]; }
  p(n, t, ease = E.lin) {
    const [s, d] = this.c[n];
    return ease(seg(t, s, d));
  }
}
