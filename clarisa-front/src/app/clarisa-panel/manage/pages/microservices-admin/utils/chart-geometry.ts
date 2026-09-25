/**
 * Geometría de las gráficas del Overview, sin dependencias.
 *
 * Por qué a mano: el look aprobado por Yeck (25-sep-2026) es el de shadcn/ui
 * Charts, y la alternativa era una isla de React o sumar d3 al bundle. Una
 * curva monótona y dos escalas lineales son 80 líneas y no tocan el
 * `package-lock` ni el Jenkinsfile.
 */

export interface Pt {
  x: number;
  y: number;
}

/** La paleta categórica de los sistemas: 16 tonos de la misma familia, luego se repite. */
export const SYSTEM_PALETTE = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#7c3aed', // violet
  '#f59e0b', // amber
  '#e11d48', // rose
  '#0891b2', // cyan
  '#65a30d', // lime
  '#ea580c', // orange
  '#c026d3', // fuchsia
  '#4f46e5', // indigo
  '#059669', // emerald
  '#0284c7', // sky
  '#db2777', // pink
  '#ca8a04', // yellow
  '#9333ea', // purple
  '#16a34a' // green
];

/** Las llaves sin sistema no compiten por un color: van en gris. */
export const NO_SYSTEM_COLOR = '#a1a1aa';

export function paletteColor(index: number): string {
  return SYSTEM_PALETTE[((index % SYSTEM_PALETTE.length) + SYSTEM_PALETTE.length) % SYSTEM_PALETTE.length];
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Curva monótona (Fritsch–Carlson): pasa por todos los puntos y nunca inventa
 * un pico que los datos no tienen, que es lo que hace una Bézier cualquiera
 * entre dos días con cero llamadas.
 */
export function monotonePath(points: Pt[]): string {
  const n = points.length;
  if (!n) {
    return '';
  }
  if (n === 1) {
    return `M${r(points[0].x)},${r(points[0].y)}`;
  }
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    m[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${r(points[0].x)},${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d +=
      ` C${r(points[i].x + h)},${r(points[i].y + t[i] * h)}` +
      ` ${r(points[i + 1].x - h)},${r(points[i + 1].y - t[i + 1] * h)}` +
      ` ${r(points[i + 1].x)},${r(points[i + 1].y)}`;
  }
  return d;
}

/** Área entre dos curvas (la de arriba y la de abajo), cerrada. */
export function bandPath(top: Pt[], bottom: Pt[]): string {
  if (!top.length) {
    return '';
  }
  const back = monotonePath([...bottom].reverse()).replace(/^M/, 'L');
  return `${monotonePath(top)} ${back} Z`;
}

/** Un tope «redondo» para el eje: 1, 2, 2.5 o 5 por la potencia de diez. */
export function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const unit = value / power;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return step * power;
}

/** «1.2k», «35k», «2.4M»: el eje no necesita más precisión que eso. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) {
    return `${Math.round((value / 1e6) * 10) / 10}M`;
  }
  if (abs >= 1e4) {
    return `${Math.round(value / 1e3)}k`;
  }
  if (abs >= 1e3) {
    return `${Math.round((value / 1e3) * 10) / 10}k`;
  }
  return `${Math.round(value)}`;
}

/** Posiciones de la etiqueta del eje X: como mucho `max`, repartidas y con la última siempre. */
export function tickIndexes(count: number, max: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count <= max) {
    return Array.from({ length: count }, (_, i) => i);
  }
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}
