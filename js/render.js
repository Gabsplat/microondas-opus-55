// Contexto de dibujo por cuadro: cámara, anidamiento de escalas, etiquetas y zonas táctiles.
import { clamp } from './core.js';
import { INK, LABEL_FONT, writeText, Stroke, seq } from './pencil.js';

export class Frame {
  constructor(g, dpr, t, opts = {}) {
    this.g = g;
    this.dpr = dpr;
    this.t = t;
    this.labels = [];
    this.hits = [];
    this.m = [1, 0, 0];
    this.stack = [];
    this.export = !!opts.export;
    this.reduced = !!opts.reduced;
    this.ui = opts.ui || 1; // escala tipográfica de pantalla
  }
  get s() { return this.m[0]; }
  // Ancho de línea en unidades del mundo: crece despacio con el zoom.
  get k() { return Math.pow(this.m[0], -0.72); }
  apply() {
    const [a, e, f] = this.m, d = this.dpr;
    this.g.setTransform(a * d, 0, 0, a * d, e * d, f * d);
  }
  setCamera(a, e, f) { this.m = [a, e, f]; this.apply(); }
  toScreen(x, y) { const [a, e, f] = this.m; return [x * a + e, y * a + f]; }
  toWorld(sx, sy) { const [a, e, f] = this.m; return [(sx - e) / a, (sy - f) / a]; }

  // Dibuja otro mundo de tamaño iw×ih dentro del rectángulo r del mundo actual.
  nest(r, iw, ih, fn, o = {}) {
    const sc = Math.min(r.w / iw, r.h / ih);
    const [a, e, f] = this.m;
    this.stack.push(this.m);
    this.g.save();
    if (o.clip) {
      this.g.beginPath();
      this.g.rect(r.x, r.y, r.w, r.h);
      this.g.clip();
    }
    const ox = r.x + (r.w - iw * sc) / 2, oy = r.y + (r.h - ih * sc) / 2;
    this.m = [a * sc, e + ox * a, f + oy * a];
    this.apply();
    fn(this);
    this.g.restore();
    this.m = this.stack.pop();
    this.apply();
  }

  // Dibuja la región ir (del mundo interior) encajada en el rectángulo r del mundo actual.
  nestRect(r, ir, fn, o = {}) {
    const sc = Math.min(r.w / ir.w, r.h / ir.h);
    const [a, e, f] = this.m;
    this.stack.push(this.m);
    this.g.save();
    if (o.clip) {
      this.g.beginPath();
      this.g.rect(r.x, r.y, r.w, r.h);
      this.g.clip();
    }
    const ox = r.x + (r.w - ir.w * sc) / 2 - ir.x * sc, oy = r.y + (r.h - ir.h * sc) / 2 - ir.y * sc;
    this.m = [a * sc, e + ox * a, f + oy * a];
    this.apply();
    fn(this);
    this.g.restore();
    this.m = this.stack.pop();
    this.apply();
  }

  // Visible en pantalla (en coordenadas del mundo actual).
  visibleWorld(vw, vh) {
    const [x0, y0] = this.toWorld(0, 0), [x1, y1] = this.toWorld(vw, vh);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  st(stroke, p, o = {}) { stroke.draw(this.g, p, { k: this.k, ...o }); }
  seq(list, p, o = {}, ov) { seq(this.g, list, p, { k: this.k, ...o }, ov); }

  // Trazo efímero (para formas que cambian cuadro a cuadro).
  sk(pts, p = 1, o = {}) {
    if (p <= 0 || pts.length < 2) return;
    const s = new Stroke(pts, { seed: o.seed ?? 71, h: o.h ?? 3.4 / Math.max(0.4, this.s ** 0.5), strands: o.strands ?? 2, wob: o.wob ?? 0.5, w: o.w, d: o.d, ink: o.ink, taper: o.taper, dash: o.dash });
    s.draw(this.g, p, { k: this.k, a: o.a });
  }

  // Tapa lo que queda detrás (borra grafito, deja ver el papel).
  erase(pts, a = 1) {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = clamp(a);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.restore();
  }

  // Lavado tenue de color (acento de energía o guía).
  wash(pts, ink, a) {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    g.fillStyle = INK[ink];
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.restore();
  }

  glow(x, y, r, a, ink = 'w') {
    if (a <= 0) return;
    const g = this.g;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = ink === 'w' ? '204,84,36' : '58,112,168';
    gr.addColorStop(0, `rgba(${c},${0.32 * a})`);
    gr.addColorStop(0.6, `rgba(${c},${0.12 * a})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Etiqueta en espacio de pantalla, anclada a un punto del mundo.
  label(x, y, text, p, o = {}) {
    if (p <= 0 || this.mute) return;
    const [sx, sy] = this.toScreen(x, y);
    this.labels.push({ sx, sy, text, p, o });
  }

  // Texto que vive en el mundo (escala con el dibujo).
  text(x, y, text, p, o = {}) {
    if (p <= 0) return;
    writeText(this.g, text, x, y, p, o);
  }

  hit(id, pts, o = {}) {
    if (this.mute) return;
    const scr = pts.map(([x, y]) => this.toScreen(x, y));
    this.hits.push({ id, pts: scr, ...o });
  }

  drawLabels() {
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const placed = [];
    const W = this.vw || 1e9;
    for (const L of this.labels) {
      const { sx, sy, text, p, o } = L;
      const size = (o.size ?? 17) * this.ui;
      const dx = (o.dx ?? 40) * this.ui, dy = (o.dy ?? -30) * this.ui;
      let tx = sx + dx, ty = sy + dy;
      // Medida del texto para no salir de la hoja ni pisar otra etiqueta.
      g.font = `${o.weight ?? 400} ${size}px ${o.font ?? LABEL_FONT}`;
      const lines = Array.isArray(text) ? text : [text];
      const tw = Math.max(...lines.map((l) => g.measureText(l).width));
      const al = o.align || (o.circle ? 'center' : dx < 0 ? 'right' : 'left');
      const left = () => (al === 'right' ? tx - tw : al === 'center' ? tx - tw / 2 : tx);
      if (left() < 8) tx += 8 - left();
      if (left() + tw > W - 8) tx -= left() + tw - (W - 8);
      const box = () => ({ x: left() - 4, y: ty - size, w: tw + 8, h: size * 1.35 * lines.length });
      const hitAny = (b) => placed.some((q) => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
      for (let k = 0; k < 6 && hitAny(box()); k++) ty += (dy < 0 ? -1 : 1) * size * 1.25;
      placed.push(box());
      const lead = o.leader !== false;
      const pl = lead ? clamp(p / 0.35) : 1;
      const pt = lead ? clamp((p - 0.3) / 0.7) : p;
      if (lead && pl > 0) {
        // Línea guía con un pequeño quiebre, como una anotación a mano.
        const kx = tx - Math.sign(dx || 1) * 6;
        const pts = [[sx, sy], [lerpN(sx, kx, 0.7), lerpN(sy, ty, 0.92)], [kx, ty - size * 0.35]];
        const s = new Stroke(pts, { seed: hashStr(String(text)), w: 1, d: 0.55, strands: 2, wob: 0.4, h: 2.5, ink: o.ink === 'w' ? 'w' : 'g' });
        s.draw(g, pl, {});
        if (o.dot !== false) {
          g.globalAlpha = 0.7 * pl;
          g.fillStyle = INK[o.ink === 'w' ? 'w' : 'g'];
          g.beginPath();
          g.arc(sx, sy, 2.2, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }
      }
      writeText(g, text, tx, ty, pt, { size, ink: o.ink, align: al, a: o.a ?? 0.92, font: o.font ?? LABEL_FONT, weight: o.weight });
      if (o.circle && pt > 0) {
        // Número encerrado en un círculo trazado a mano.
        const r = Math.max(tw * 0.75, size * 0.72);
        const cy = ty - size * 0.36;
        const pts = [];
        for (let i = 0; i <= 26; i++) {
          const a = -2.2 + (i / 26) * (Math.PI * 2 + 0.5);
          const rr = r * (1 + 0.06 * Math.sin(i * 1.7));
          pts.push([tx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
        }
        new Stroke(pts, { seed: hashStr(text) + 5, w: 1.1, d: 0.6, strands: 2, wob: 0.3, h: 2, ink: o.ink || 'g' }).draw(g, pt, { a: o.a ?? 1 });
      }
    }
  }
}

const lerpN = (a, b, t) => a + (b - a) * t;
function hashStr(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}
