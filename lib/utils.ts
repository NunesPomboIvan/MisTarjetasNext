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
 * Devuelve un Date que, leído en la zona horaria del servidor con getDate/getHours,
 * devuelve los componentes de fecha y hora de Argentina (UTC-3, sin DST).
 *
 * Se usa para que el SSR no muestre la fecha del servidor (UTC en Vercel) cuando
 * en Argentina ya es otro día.
 */
export function nowInArgentina(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const m: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) m[p.type] = p.value;
  return new Date(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    Number(m.hour),
    Number(m.minute),
    Number(m.second),
  );
}

/**
 * Formatea una fecha con locale español
 */
export function formatDate(date: Date | string, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt, { locale: es });
}

/**
 * Fecha larga con día de la semana: "Jueves, 18 de Junio".
 * Coma tras el día de la semana, mes completo, ambos capitalizados.
 */
export function formatWeekdayLongDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const weekday = capitalize(format(d, "EEEE", { locale: es }));
  const day = format(d, "d", { locale: es });
  const month = capitalize(format(d, "MMMM", { locale: es }));
  return `${weekday}, ${day} de ${month}`;
}

/**
 * Fecha larga sin día de la semana, mes completo: "18 de Junio"
 * (o "18 de Junio 2024" con withYear).
 */
export function formatLongDate(date: Date | string, withYear = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = format(d, "d", { locale: es });
  const month = capitalize(format(d, "MMMM", { locale: es }));
  const year = withYear ? ` ${format(d, "yyyy")}` : "";
  return `${day} de ${month}${year}`;
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
  // Preservar un signo negativo inicial (devoluciones / reintegros).
  const negative = /^\s*-/.test(raw);
  // Normalizar: quitar puntos (separador de miles) pero mantener coma/punto decimal
  // Sólo permitir dígitos y un único separador
  const cleaned = raw.replace(/[^\d.,]/g, "");
  // Si todavía no se escribió ningún dígito, devolver sólo el signo (o vacío).
  if (cleaned === "") return negative ? "-" : "";

  // Determinar separador decimal: el último ',' o '.' que aparezca con dígitos después
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let decimalIdx = -1;
  if (lastComma > -1 && lastComma > lastDot) decimalIdx = lastComma;
  // Sólo tratamos un punto como decimal si NO hay comas, hay un único punto,
  // y a continuación hay como máximo 2 dígitos (típico de decimales).
  // Si hay 3+ dígitos después, asumimos que es separador de miles (ej "1.500").
  // Esto evita que "1.500" se reduzca a "1,50" tras formateo.
  else if (lastDot > -1 && lastComma === -1) {
    const pointCount = (cleaned.match(/\./g) ?? []).length;
    const digitsAfter = cleaned.length - lastDot - 1;
    if (pointCount === 1 && digitsAfter >= 1 && digitsAfter <= 2) {
      decimalIdx = lastDot;
    }
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

  const out = decimalIdx > -1 ? `${intFormatted},${decPart}` : intFormatted;
  return negative ? `-${out}` : out;
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
