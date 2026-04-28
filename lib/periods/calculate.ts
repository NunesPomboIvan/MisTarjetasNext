/**
 * lib/periods/calculate.ts
 *
 * Lógica de cálculo de períodos de tarjetas de crédito.
 * FUNCIONES PURAS — sin acceso a base de datos ni estado global.
 *
 * Conceptos:
 * - Un período se identifica por el mes/año en que CIERRA.
 * - Ej: tarjeta con close_date=2026-01-23, due_date=2026-01-10:
 *   - "Marzo 2026" = desde 24/feb/2026 (00:00) hasta 23/mar/2026 (23:59:59.999)
 *   - Vence el 10/abr/2026
 * - Solo se usa el día del mes de close_date y due_date; el mes/año almacenado
 *   es solo una referencia visual para el selector de fecha.
 *
 * Timezone: Los cálculos usan new Date() local. En producción en Argentina
 * (UTC-3 sin DST) esto es correcto. En tests se usa vi.setSystemTime() con
 * fechas en UTC para simular la TZ argentina.
 */

import {
  addMonths,
  startOfDay,
  endOfDay,
  getDaysInMonth,
  isBefore,
  isAfter,
  isWithinInterval,
  format,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

/** Subconjunto de Card necesario para calcular períodos */
export interface CardForPeriod {
  close_date: string; // YYYY-MM-DD — solo se usa el día del mes
  due_date: string;   // YYYY-MM-DD — solo se usa el día del mes
}

/** Subconjunto de Expense necesario para cálculos */
export interface ExpenseForPeriod {
  expense_date: string | Date;
  installments: number;
}

export type PeriodStatus = "past" | "current" | "future";

export interface Period {
  /** Primer día del período (día siguiente al cierre del mes anterior), 00:00 */
  start: Date;
  /** Último día del período (día de cierre), 23:59:59.999 */
  end: Date;
  /** Fecha de vencimiento (due_day del mes siguiente al cierre), 00:00 */
  due: Date;
  /** Estado del período respecto a hoy */
  status: PeriodStatus;
  /** Etiqueta legible: "Marzo 2026" */
  label: string;
  /** Clave estable para comparación: "2026-03" */
  key: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────

/**
 * Ajusta el día del mes respetando meses más cortos.
 * setDayOfMonth(2026, 2, 31) → 28/feb/2026 (último día de febrero)
 * setDayOfMonth(2026, 2, 29) → 28/feb/2026 (año no bisiesto)
 */
export function setDayOfMonth(year: number, month: number, day: number): Date {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const actualDay = Math.min(day, daysInMonth);
  return new Date(year, month - 1, actualDay, 0, 0, 0, 0);
}

/**
 * Navega al mes anterior conservando year/month 1-based.
 */
function prevYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/**
 * Navega al mes siguiente conservando year/month 1-based.
 */
function nextYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Construye un Period completo dado el mes/año de cierre.
 *
 * Período "closeMonth/closeYear":
 *   start = (close_day + 1) del mes anterior, 00:00
 *   end   = close_day del closeMonth, 23:59:59.999
 *   due   = due_day del mes siguiente al cierre, 00:00
 */
function buildPeriod(
  card: CardForPeriod,
  closeYear: number,
  closeMonth: number, // 1-based
  now: Date
): Period {
  const closeDay = parseLocalDate(card.close_date).getDate();
  const dueDay = parseLocalDate(card.due_date).getDate();

  // Fecha de cierre
  const closeDate = setDayOfMonth(closeYear, closeMonth, closeDay);
  const end = endOfDay(closeDate);

  // start = día siguiente al cierre del mes anterior
  const prev = prevYearMonth(closeYear, closeMonth);
  const prevClose = setDayOfMonth(prev.year, prev.month, closeDay);
  const start = startOfDay(addDays(prevClose, 1));

  // due = due_day del mes siguiente al cierre
  const next = nextYearMonth(closeYear, closeMonth);
  const due = setDayOfMonth(next.year, next.month, dueDay);

  // Status (comparamos inicio del día para consistencia)
  const nowDay = startOfDay(now);
  let status: PeriodStatus;
  if (isAfter(nowDay, end)) {
    status = "past";
  } else if (isBefore(nowDay, start)) {
    status = "future";
  } else {
    status = "current";
  }

  // Label en español con primera letra mayúscula
  const rawLabel = format(closeDate, "MMMM yyyy", { locale: es });
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  // Key estable
  const key = `${closeYear}-${String(closeMonth).padStart(2, "0")}`;

  return { start, end, due, status, label, key };
}

// ─────────────────────────────────────────────────────────────
// FUNCIONES PÚBLICAS
// ─────────────────────────────────────────────────────────────

/**
 * Dado una fecha, determina en qué período de la tarjeta cae.
 *
 * Regla: si la fecha <= close_day del mes de la fecha → período de ese mes
 *        si la fecha >  close_day del mes de la fecha → período del mes siguiente
 */
export function getPeriodForDate(card: CardForPeriod, date: Date): Period {
  const now = new Date();
  const d = startOfDay(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based

  const closeDay = parseLocalDate(card.close_date).getDate();
  const closeDateThisMonth = setDayOfMonth(year, month, closeDay);

  let closeYear: number;
  let closeMonth: number;

  if (!isAfter(d, closeDateThisMonth)) {
    // La compra cayó antes o en el día de cierre → período de este mes
    closeYear = year;
    closeMonth = month;
  } else {
    // La compra cayó después del cierre → período del mes siguiente
    const n = nextYearMonth(year, month);
    closeYear = n.year;
    closeMonth = n.month;
  }

  return buildPeriod(card, closeYear, closeMonth, now);
}

/**
 * Período actual de la tarjeta (según la fecha de hoy).
 */
export function getCurrentPeriod(card: CardForPeriod): Period {
  return getPeriodForDate(card, new Date());
}

/**
 * Período con offset en meses respecto al período actual.
 * offsetMonths =  0 → período actual
 * offsetMonths = -1 → período anterior
 * offsetMonths = +1 → período siguiente
 */
export function getPeriodByOffset(card: CardForPeriod, offsetMonths: number): Period {
  const current = getCurrentPeriod(card);
  const [yearStr, monthStr] = current.key.split("-");
  const base = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const target = addMonths(base, offsetMonths);

  return buildPeriod(card, target.getFullYear(), target.getMonth() + 1, new Date());
}

/**
 * Genera un rango de períodos centrado en el actual.
 * @param range.past   cuántos períodos pasados incluir
 * @param range.future cuántos períodos futuros incluir
 * Retorna los períodos ordenados de más antiguo a más nuevo.
 */
export function getPeriods(
  card: CardForPeriod,
  range: { past: number; future: number }
): Period[] {
  const periods: Period[] = [];
  for (let i = -range.past; i <= range.future; i++) {
    periods.push(getPeriodByOffset(card, i));
  }
  return periods;
}

/**
 * Determina si la cuota `installmentIndex` (0-based) de un gasto cae dentro del período.
 * Si no se pasa installmentIndex, retorna true si CUALQUIER cuota cae en el período.
 */
export function expenseFallsInPeriod(
  expense: ExpenseForPeriod,
  period: Period,
  installmentIndex?: number
): boolean {
  const dates = getInstallmentDates(expense);

  if (installmentIndex !== undefined) {
    const d = dates[installmentIndex];
    if (!d) return false;
    return isWithinInterval(startOfDay(d), { start: period.start, end: period.end });
  }

  return dates.some((d) =>
    isWithinInterval(startOfDay(d), { start: period.start, end: period.end })
  );
}

/**
 * Retorna el índice (0-based) de la cuota que cae en el período dado.
 * Retorna -1 si ninguna cuota cae en el período.
 */
export function getInstallmentIndexInPeriod(
  expense: ExpenseForPeriod,
  period: Period
): number {
  const dates = getInstallmentDates(expense);
  return dates.findIndex((d) =>
    isWithinInterval(startOfDay(d), { start: period.start, end: period.end })
  );
}

/**
 * Retorna un array con la fecha correspondiente a cada cuota.
 * La cuota 0 = fecha de la compra (determina el período de inicio).
 * La cuota N = addMonths(fecha, N).
 */
export function getInstallmentDates(expense: ExpenseForPeriod): Date[] {
  // Parsear la fecha evitando el timezone shift de ISO strings sin hora
  const expenseDate =
    typeof expense.expense_date === "string"
      ? parseLocalDate(expense.expense_date)
      : expense.expense_date;

  const dates: Date[] = [];
  for (let i = 0; i < expense.installments; i++) {
    dates.push(addMonths(expenseDate, i));
  }
  return dates;
}

/**
 * Parsea "YYYY-MM-DD" como fecha local (medianoche) sin conversión TZ.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Calcula el monto de cuotas que caen en un período específico.
 */
export function getAmountInPeriod(
  expense: ExpenseForPeriod & { installment_amount: number },
  period: Period
): number {
  const dates = getInstallmentDates(expense);
  const count = dates.filter((d) =>
    isWithinInterval(startOfDay(d), { start: period.start, end: period.end })
  ).length;
  return count * expense.installment_amount;
}
