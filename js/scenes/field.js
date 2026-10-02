// Patrón cualitativo de campo en el piso de la cavidad (compartido por los capítulos 03 y 04).
// No es una solución de las ecuaciones de Maxwell: es una mezcla de dos modos para ilustrar
// zonas fuertes y débiles separadas por unos 6 cm (media longitud de onda de 12,2 cm).
const PI = Math.PI;
export function fieldI(u, v) {
  const a = Math.sin(5 * PI * u) * Math.sin(4 * PI * v);
  const b = Math.sin(4 * PI * u + 0.7) * Math.sin(3 * PI * v + 0.3);
  return Math.min(1, (0.68 * a * a + 0.42 * b * b) * 1.05);
}

// Homografía: cuadrado unitario → cuadrilátero (p0=(0,0), p1=(1,0), p2=(1,1), p3=(0,1)).
export function quadMap(p0, p1, p2, p3) {
  const [x0, y0] = p0, [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  const fwd = (u, v) => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
  };
  // Inversa por adjunta de la matriz 3×3.
  const M = [a, b, c, d, e, f, g, h, 1];
  const A = [
    M[4] * M[8] - M[5] * M[7], M[2] * M[7] - M[1] * M[8], M[1] * M[5] - M[2] * M[4],
    M[5] * M[6] - M[3] * M[8], M[0] * M[8] - M[2] * M[6], M[2] * M[3] - M[0] * M[5],
    M[3] * M[7] - M[4] * M[6], M[1] * M[6] - M[0] * M[7], M[0] * M[4] - M[1] * M[3],
  ];
  const inv = (x, y) => {
    const w = A[6] * x + A[7] * y + A[8];
    return [(A[0] * x + A[1] * y + A[2]) / w, (A[3] * x + A[4] * y + A[5]) / w];
  };
  fwd.inv = inv;
  return fwd;
}
