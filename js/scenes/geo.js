// Geometría 3D mínima en proyección caballera, compartida por varios capítulos.
import { cab, TAU, lerp } from '../core.js';
import { S, hatch, hatchQuad } from '../pencil.js';

export function makeProj(ox, oy) {
  return (x, y, z) => cab(x, y, z, ox, oy);
}

// Caja con caras visibles: frente (z0), techo (y1) y lateral derecho (x1).
export function box(P, x0, y0, z0, x1, y1, z1, o = {}) {
  const A = P(x0, y0, z0), B = P(x1, y0, z0), C = P(x1, y1, z0), D = P(x0, y1, z0);
  const B2 = P(x1, y0, z1), C2 = P(x1, y1, z1), D2 = P(x0, y1, z1), A2 = P(x0, y0, z1);
  const w = o.w ?? 1.6, d = o.d ?? 0.86, over = o.over ?? 3;
  const st = (a, b, extra = {}) => S([a, b], { w, d, over, ...extra });
  const edges = [];
  if (o.front !== false) edges.push(st(D, A), st(A, B), st(B, C), st(C, D));
  else edges.push(st(A, B));
  edges.push(st(D, D2), st(C, C2), st(D2, C2));
  edges.push(st(B, B2), st(B2, C2));
  const hidden = o.hidden ? [st(A, A2, { dash: [6, 6], d: 0.3, w: 1 }), st(A2, B2, { dash: [6, 6], d: 0.3, w: 1 }), st(A2, D2, { dash: [6, 6], d: 0.3, w: 1 })] : [];
  const sil = [A, B, B2, C2, D2, D];
  return { edges, hidden, sil, faces: { front: [A, B, C, D], top: [D, C, C2, D2], right: [B, B2, C2, C] } };
}

// Círculo en un plano 3D. axis: eje normal al plano ('x', 'y' o 'z').
export function circle3(P, cx, cy, cz, r, axis, a0 = 0, a1 = TAU, n = 48) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const c = Math.cos(a) * r, s = Math.sin(a) * r;
    if (axis === 'y') out.push(P(cx + c, cy, cz + s));
    else if (axis === 'x') out.push(P(cx, cy + s, cz + c));
    else out.push(P(cx + c, cy + s, cz));
  }
  return out;
}

// Cilindro sobre un eje, con rayado que sigue su curvatura.
export function cylinder(P, c0, c1, r, axis, o = {}) {
  const e0 = circle3(P, ...c0, r, axis);
  const e1 = circle3(P, ...c1, r, axis);
  // Generatrices extremas: los puntos del contorno más alejados del eje proyectado.
  const ax = [e1[0][0] - e0[0][0], e1[0][1] - e0[0][1]];
  const len = Math.hypot(...ax) || 1;
  const nx = -ax[1] / len, ny = ax[0] / len;
  let iMax = 0, iMin = 0, vMax = -Infinity, vMin = Infinity;
  for (let i = 0; i < e0.length - 1; i++) {
    const v = e0[i][0] * nx + e0[i][1] * ny;
    if (v > vMax) { vMax = v; iMax = i; }
    if (v < vMin) { vMin = v; iMin = i; }
  }
  const w = o.w ?? 1.5;
  const strokes = [S(e1, { w, over: 0 }), S([e0[iMax], e1[iMax]], { w, over: 2 }), S([e0[iMin], e1[iMin]], { w, over: 2 })];
  // Medio contorno del extremo lejano: la mitad que queda más lejos del extremo cercano.
  const n = e0.length - 1;
  const halfA = [], halfB = [];
  for (let k = 0; k <= n / 2; k++) halfA.push(e0[(iMax + k) % n]);
  for (let k = 0; k <= n / 2; k++) halfB.push(e0[(iMin + k) % n]);
  const cx = e1.reduce((s, p) => s + p[0], 0) / e1.length, cy = e1.reduce((s, p) => s + p[1], 0) / e1.length;
  const far = (h) => Math.hypot(h[h.length >> 1][0] - cx, h[h.length >> 1][1] - cy);
  const useA = far(halfA) > far(halfB);
  strokes.push(S(useA ? halfA : halfB, { w: w * 0.9, over: 0, d: 0.7 }));
  const start = useA ? iMin : iMax; // la cara visible del cuerpo es la otra mitad
  const sh = o.hatch ?? 14;
  const hat = sh
    ? hatch(sh, (u) => {
        // Rayas a lo largo del eje, más juntas hacia el lado en sombra.
        const k = Math.round(start + (n / 2) * (0.5 + 0.5 * u)) % n;
        return [e0[k], e1[k]];
      }, { dist: (u) => Math.pow(u, 0.55), d: 0.36, w: 0.8 })
    : [];
  return { strokes, hatch: hat, e0, e1 };
}

export { hatchQuad };
