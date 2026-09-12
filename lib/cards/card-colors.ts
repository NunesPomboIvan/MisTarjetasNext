/**
 * Utilidades de color derivadas del `card.color` de cada tarjeta, usadas para
 * pintar el gradiente y elegir texto legible (claro/oscuro) sobre ese fondo.
 * Compartidas por WalletCard y por la card unificada de detalle.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

export function tint(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export interface CardPalette {
  base: string;
  isLight: boolean;
  /** Texto principal (montos, títulos). */
  fg: string;
  /** Texto secundario apagado (labels, fechas no alcanzadas). */
  fgMuted: string;
  /** Texto secundario con más presencia que fgMuted (nombre/marca, número). */
  fgSecondary: string;
  /** Paradas del gradiente de 3 tonos. */
  g0: string;
  g1: string;
  g2: string;
  /** Color base para la sombra proyectada (más oscuro). */
  shadowRgb: { r: number; g: number; b: number };
}

/** Deriva toda la paleta de una tarjeta a partir de su color de marca. */
export function getCardPalette(color: string | null | undefined): CardPalette {
  const base = color || "#6366f1";
  const lum = relativeLuminance(base);
  const isLight = lum > 0.45;

  const fg = isLight ? "rgba(18,10,4,0.93)" : "rgba(255,252,245,0.95)";
  const fgMuted = isLight ? "rgba(18,10,4,0.52)" : "rgba(255,252,245,0.58)";
  const fgSecondary = isLight ? "rgba(18,10,4,0.65)" : "rgba(255,252,245,0.65)";

  const g0 = tint(base, 0.28);
  const g1 = base;
  const g2 = shade(base, 0.42);

  const shadowHex = shade(base, 0.1);
  const shadowRgb = hexToRgb(shadowHex);

  return { base, isLight, fg, fgMuted, fgSecondary, g0, g1, g2, shadowRgb };
}
