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
