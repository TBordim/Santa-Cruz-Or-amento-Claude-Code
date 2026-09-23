// Conversão aproximada de LAB pra uma cor de tela (sRGB, branco de referência D65) — apoio
// visual de intuição pro colorista, inspirado no Color Engine (Esko) que a Santa Cruz já usa.
// NÃO é validação de cor: nenhuma tela substitui a cabine de luz D50. Serve só pra "essa
// direção faz sentido?", não pra aprovar nada.
import type { Lab } from "./deltae";

const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

function labToXyz({ l, a, b }: Lab) {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  return { x: inv(fx) * REF_X, y: inv(fy) * REF_Y, z: inv(fz) * REF_Z };
}

function xyzToSrgb({ x, y, z }: { x: number; y: number; z: number }) {
  const X = x / 100;
  const Y = y / 100;
  const Z = z / 100;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let b = X * 0.0557 + Y * -0.204 + Z * 1.057;

  const gamma = (c: number) => (c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);
  r = gamma(r);
  g = gamma(g);
  b = gamma(b);

  const clamp = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

export function labToCssColor(lab: Lab): string {
  const { r, g, b } = xyzToSrgb(labToXyz(lab));
  return `rgb(${r}, ${g}, ${b})`;
}
