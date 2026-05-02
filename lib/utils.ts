import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Combina clases de Tailwind de forma segura (shadcn pattern)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un monto en pesos argentinos
 * @example formatCurrency(1500) // → "$ 1.500,00"
 */
export function formatCurrency(amount: number, currency: "ARS" | "USD" = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha con locale español
 */
export function formatDate(date: Date | string, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt, { locale: es });
}

/**
 * Formatea una fecha relativa (ej: "hace 2 días")
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Capitaliza la primera letra
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trunca texto con elipsis
 */
export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

/**
 * Genera un color hex aleatorio (útil para nuevas categorías)
 */
export function randomColor(): string {
  const colors = [
    "#f97316",
    "#fb923c",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f43f5e",
    "#6366f1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Parsea un número desde string con formato argentino (punto = miles, coma = decimal)
 */
export function parseArgentineNumber(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized);
}

/**
 * Formatea un input de monto en tiempo real con separador de miles argentino.
 * - Acepta solo dígitos y un único separador decimal (coma o punto)
 * - Inserta puntos cada 3 dígitos en la parte entera
 * - Permite hasta 2 decimales
 *
 * @example formatAmountInput("1500") → "1.500"
 * @example formatAmountInput("1500,5") → "1.500,5"
 * @example formatAmountInput("1.500.000,75") → "1.500.000,75"
 */
export function formatAmountInput(raw: string): string {
  if (!raw) return "";
  // Normalizar: quitar puntos (separador de miles) pero mantener coma/punto decimal
  // Sólo permitir dígitos y un único separador
  const cleaned = raw.replace(/[^\d.,]/g, "");

  // Determinar separador decimal: el último ',' o '.' que aparezca con dígitos después
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let decimalIdx = -1;
  if (lastComma > -1 && lastComma > lastDot) decimalIdx = lastComma;
  // Sólo tratamos un punto como decimal si NO hay comas y hay dígitos después
  // (el punto es separador de miles en Argentina, salvo que sea el único separador)
  // Para facilidad de uso, si el usuario tipea "1500.5" lo tomamos como decimal.
  else if (lastDot > -1 && lastComma === -1) {
    // sólo si hay un único punto y va al final (decimal)
    const pointCount = (cleaned.match(/\./g) ?? []).length;
    if (pointCount === 1) decimalIdx = lastDot;
  }

  let intPart = "";
  let decPart = "";
  if (decimalIdx > -1) {
    intPart = cleaned.slice(0, decimalIdx).replace(/[.,]/g, "");
    decPart = cleaned.slice(decimalIdx + 1).replace(/[.,]/g, "").slice(0, 2);
  } else {
    intPart = cleaned.replace(/[.,]/g, "");
  }

  // Quitar ceros a la izquierda salvo que la parte entera sea exactamente "0"
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "") intPart = "0";

  // Insertar puntos cada 3 dígitos
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return decimalIdx > -1 ? `${intFormatted},${decPart}` : intFormatted;
}

/**
 * Convierte un input formateado al estilo argentino a número
 */
export function unformatAmount(formatted: string): number {
  if (!formatted) return 0;
  const normalized = formatted.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}
