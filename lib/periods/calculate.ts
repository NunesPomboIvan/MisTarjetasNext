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
  format,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";

/**
 * "Ahora" en zona horaria de Argentina (UTC-3, sin DST). El servidor de
 * producción corre en UTC; si usáramos `new Date()` directamente, después de
 * las 21:00 hora argentina el server interpretaría que ya es el día siguiente
 * y el período "actual" se adelantaría un mes.
 */
function nowAr(): Date {
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

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

/**
 * Historial de fechas de cierre/vencimiento por período.
 * Clave  = period key "YYYY-MM" HASTA el cual (inclusive) aplican esas fechas.
 * Valor  = las fechas que regían hasta ese período.
 * Los períodos posteriores a la mayor clave usan close_date/due_date de la
 * tarjeta. Esto permite que un cambio de fechas rija solo hacia adelante sin
 * reescribir los períodos históricos.
 */
export type PeriodDateOverrides = Record<
  string,
  { close_date: string; due_date: string }
>;

/** Subconjunto de Card necesario para calcular períodos */
export interface CardForPeriod {
  close_date: string; // YYYY-MM-DD — solo se usa el día del mes
  due_date: string;   // YYYY-MM-DD — solo se usa el día del mes
  date_overrides?: PeriodDateOverrides | null;
}

/** Subconjunto de Expense necesario para cálculos */
export interface ExpenseForPeriod {
  expense_date: string | Date;
  installments: number;
  /** Montos individuales por cuota. Clave = índice 0-based (string). null = todas usan installment_amount */
  installment_amounts?: Record<string, number> | null;
  /** Moneda del consumo. Si es USD se convierte a ARS con exchange_rate en los totales. */
  currency?: string | null;
  /** Tipo de cambio (ARS por 1 USD). Sólo se usa cuando currency = USD. */
  exchange_rate?: number | null;
  /**
   * Consumo fijo mensual (sin fin): cae en TODOS los períodos desde su fecha
   * en adelante, ignorando `installments`. El monto mensual es installment_amount.
   */
  recurring?: boolean | null;
  /** Índices 0-based excluidos (ver getInstallmentIndexInPeriod). "Eliminar solo este período" en recurrentes. */
  excluded_installments?: number[] | null;
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
  /**
   * Tarjeta con la que se construyó el período. Referencia interna: permite
   * que las funciones de bucketing (expenseFallsInPeriod, etc.) anclen las
   * cuotas a la cadena de períodos sin cambiar sus firmas.
   */
  card: CardForPeriod;
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

/** Construye la clave "YYYY-MM" de un período. */
function keyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Parsea una clave "YYYY-MM" a year/month 1-based. */
function parseKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

/** Suma (o resta) meses a una clave "YYYY-MM", con salto de año. */
export function addMonthsToKey(key: string, months: number): string {
  const { year, month } = parseKey(key);
  const total = year * 12 + (month - 1) + months;
  return keyOf(Math.floor(total / 12), (total % 12) + 1);
}

/** Diferencia en meses entre dos claves: monthsBetweenKeys("2026-03", "2026-05") = 2 */
function monthsBetweenKeys(from: string, to: string): number {
  const a = parseKey(from);
  const b = parseKey(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/**
 * Resuelve qué días de cierre/vencimiento rigen para un período dado.
 * Si hay overrides, aplica el de menor clave que sea >= key (las claves son
 * "hasta este período inclusive"). Si no hay ninguno que cubra el período,
 * rigen las fechas actuales de la tarjeta.
 */
function configForKey(
  card: CardForPeriod,
  key: string
): { closeDay: number; dueDay: number } {
  const overrides = card.date_overrides;
  if (overrides) {
    let bestUntil: string | null = null;
    for (const until of Object.keys(overrides)) {
      if (key <= until && (bestUntil === null || until < bestUntil)) {
        bestUntil = until;
      }
    }
    if (bestUntil !== null) {
      const entry = overrides[bestUntil];
      return {
        closeDay: parseLocalDate(entry.close_date).getDate(),
        dueDay: parseLocalDate(entry.due_date).getDate(),
      };
    }
  }
  return {
    closeDay: parseLocalDate(card.close_date).getDate(),
    dueDay: parseLocalDate(card.due_date).getDate(),
  };
}

/**
 * Construye un Period completo dado el mes/año de cierre.
 *
 * Período "closeMonth/closeYear":
 *   start = (close_day + 1) del mes anterior, 00:00
 *   end   = close_day del closeMonth, 23:59:59.999
 *   due   = due_day del MISMO mes si due_day >= close_day; del mes siguiente
 *           si due_day < close_day (el vencimiento "envuelve"), 00:00
 */
function buildPeriod(
  card: CardForPeriod,
  closeYear: number,
  closeMonth: number, // 1-based
  now: Date
): Period {
  // Key estable
  const key = keyOf(closeYear, closeMonth);

  // Las fechas pueden variar por período (overrides históricos): este período
  // usa su propia config, y el inicio depende del cierre del período ANTERIOR.
  const { closeDay, dueDay } = configForKey(card, key);

  // Fecha de cierre
  const closeDate = setDayOfMonth(closeYear, closeMonth, closeDay);
  const end = endOfDay(closeDate);

  // start = día siguiente al cierre del mes anterior
  const prev = prevYearMonth(closeYear, closeMonth);
  const prevCloseDay = configForKey(card, keyOf(prev.year, prev.month)).closeDay;
  const prevClose = setDayOfMonth(prev.year, prev.month, prevCloseDay);
  const start = startOfDay(addDays(prevClose, 1));

  // Vencimiento: si el día de vencimiento es MAYOR O IGUAL al día de cierre,
  // la tarjeta vence en el MISMO mes que cierra (ej: cierra 05, vence 19).
  // Si el día de vencimiento es MENOR, el vencimiento "envuelve" al mes
  // siguiente (ej: cierra 23, vence 10 → 10 del mes siguiente).
  let dueYear = closeYear;
  let dueMonth = closeMonth;
  if (dueDay < closeDay) {
    const next = nextYearMonth(closeYear, closeMonth);
    dueYear = next.year;
    dueMonth = next.month;
  }
  const due = setDayOfMonth(dueYear, dueMonth, dueDay);

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

  return { start, end, due, status, label, key, card };
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
  const now = nowAr();
  const d = startOfDay(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based

  const { closeDay } = configForKey(card, keyOf(year, month));
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
  return getPeriodForDate(card, nowAr());
}

/**
 * Construye el período identificado por su clave "YYYY-MM".
 */
export function getPeriodByKey(card: CardForPeriod, key: string): Period {
  const { year, month } = parseKey(key);
  return buildPeriod(card, year, month, nowAr());
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

  return buildPeriod(card, target.getFullYear(), target.getMonth() + 1, nowAr());
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
 * Período cuyo vencimiento es el inmediato siguiente a la fecha de hoy
 * (incluye el que vence hoy). Recorre períodos alrededor del actual y elige
 * el de menor `due` cuyo vencimiento no haya pasado todavía.
 *
 * Ej: hoy 10/may; si la tarjeta vence el 6 de junio, devuelve el período
 * cuyo saldo se paga el 6/jun (aunque su cierre sea posterior a hoy).
 *
 * Si todos los vencimientos ya pasaron, cae al período actual.
 */
export function getNextDuePeriod(card: CardForPeriod): Period {
  const todayStart = startOfDay(nowAr());
  let best: Period | null = null;
  for (let offset = -6; offset <= 6; offset++) {
    const p = getPeriodByOffset(card, offset);
    if (isBefore(p.due, todayStart)) continue; // ya venció
    if (!best || isBefore(p.due, best.due)) best = p;
  }
  return best ?? getCurrentPeriod(card);
}

/**
 * Pago próximo de una tarjeta: el período de menor `due` cuyo vencimiento no
 * pasó (incluye hoy) Y que tenga saldo > 0.
 *
 * A diferencia de `getNextDuePeriod`, salta los períodos vacíos. Esto evita
 * ocultar una tarjeta cuando su período más próximo a vencer ya cerró sin
 * consumos pero un período posterior (todavía abierto) sí tiene saldo a pagar.
 *
 * `cardExpenses` deben ser los gastos de ESA tarjeta (ya filtrados por card_id).
 * Devuelve null si la tarjeta no tiene ningún pago pendiente.
 */
export function getNextPayment(
  card: CardForPeriod,
  cardExpenses: (ExpenseForPeriod & { installment_amount: number })[]
): { period: Period; total: number } | null {
  const todayStart = startOfDay(nowAr());
  let best: { period: Period; total: number } | null = null;
  for (let offset = -6; offset <= 6; offset++) {
    const period = getPeriodByOffset(card, offset);
    if (isBefore(period.due, todayStart)) continue; // ya venció
    const total = cardExpenses.reduce((s, e) => s + getAmountInPeriodArs(e, period), 0);
    if (total <= 0) continue; // período sin saldo → lo saltamos
    if (!best || isBefore(period.due, best.period.due)) best = { period, total };
  }
  return best;
}

/**
 * Clave del período base de un gasto: el período en que cae la COMPRA
 * (cuota 0) según su fecha. Las cuotas siguientes quedan ANCLADAS a la
 * cadena: cuota N → período base + N meses. Esto garantiza que un cambio
 * de fechas de cierre hacia adelante nunca re-asigne cuotas ya cargadas.
 */
function getExpenseBaseKey(card: CardForPeriod, expense: ExpenseForPeriod): string {
  const expenseDate =
    typeof expense.expense_date === "string"
      ? parseLocalDate(expense.expense_date)
      : expense.expense_date;
  return getPeriodForDate(card, expenseDate).key;
}

/**
 * Período en el que cae la cuota `index` (0-based) de un gasto:
 * período de la compra + index meses.
 */
export function getInstallmentPeriod(
  card: CardForPeriod,
  expense: ExpenseForPeriod,
  index: number
): Period {
  const baseKey = getExpenseBaseKey(card, expense);
  return getPeriodByKey(card, addMonthsToKey(baseKey, index));
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
  const idx = getInstallmentIndexInPeriod(expense, period);
  if (installmentIndex !== undefined) return idx === installmentIndex;
  return idx !== -1;
}

/**
 * Retorna el índice (0-based) de la cuota que cae en el período dado.
 * Retorna -1 si ninguna cuota cae en el período.
 */
export function getInstallmentIndexInPeriod(
  expense: ExpenseForPeriod,
  period: Period
): number {
  const baseKey = getExpenseBaseKey(period.card, expense);
  const idx = monthsBetweenKeys(baseKey, period.key);
  if (idx < 0) return -1;
  if (expense.excluded_installments?.includes(idx)) return -1;
  // Recurrente: aparece en todos los períodos desde su fecha en adelante,
  // sin tope de cuotas. El índice = cantidad de meses desde la compra, lo que
  // permite además overrides de monto por mes vía installment_amounts.
  if (expense.recurring) return idx;
  return idx < expense.installments ? idx : -1;
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
 * Retorna true si la fecha de cierre almacenada en la tarjeta ya pasó.
 * Se compara la fecha completa (no solo el día del mes) contra hoy.
 * Cuando esto es true, el usuario debe ingresar un nuevo período.
 */
export function isCurrentPeriodExpired(card: CardForPeriod): boolean {
  const closeDate = parseLocalDate(card.close_date);
  return isBefore(closeDate, startOfDay(nowAr()));
}

/**
 * Posición mínima/máxima del nodo "Cierre" para que no se pegue a los otros
 * dos. Asimétrico porque "Últ. venc." (10 caracteres) es más ancho que
 * "Vencim." (7): con 34 de mínimo llegaban a tocarse en tarjetas angostas
 * (mobile) cuando el cierre cae muy cerca del último vencimiento.
 */
const CLOSE_PCT_MIN = 38;
const CLOSE_PCT_MAX = 66;

/**
 * Línea de tiempo del período para la card de detalle. Tres hitos:
 *   1. Último vencimiento → vencimiento del período anterior
 *   2. Cierre actual      → cierre del período que se está viendo
 *   3. Vencimiento actual → vencimiento del período que se está viendo
 *
 * Eje de la barra: del último vencimiento al vencimiento actual. El último
 * vencimiento queda en 0 %, el vencimiento actual en 100 % y el cierre en su
 * posición real, acotada a [CLOSE_PCT_MIN, CLOSE_PCT_MAX] para que los nodos
 * no se amontonen. El avance de "hoy" se re-mapea sobre esas posiciones, así
 * el punto coincide con el nodo del cierre justo el día del cierre.
 *
 * `firstPeriodKey` (opcional): clave del primer período de la tarjeta. Si el
 * período que se navega es ese primero (o anterior), no hay período previo y
 * `lastDue` vuelve null — el primer hito se muestra con guiones.
 */
export interface PeriodTimeline {
  /** Vencimiento del período anterior. null si no hay período previo. */
  lastDue: Date | null;
  close: Date;
  due: Date;
  lastDueReached: boolean;
  closeReached: boolean;
  dueReached: boolean;
  /**
   * Hito a resaltar en la línea de tiempo: "close" mientras no haya cerrado,
   * "due" desde que cierra y hasta que vence, null si ya venció (no queda
   * ningún hito futuro). A propósito NO depende de `lastDueReached`: ese hito
   * puede quedar en el futuro (cuando el vencimiento "envuelve" al mes
   * siguiente, ver `buildPeriod`) sin que eso deba ocultar el resaltado de
   * cierre/vencimiento.
   */
  highlightKey: "close" | "due" | null;
  /** Posición del nodo "Cierre" en la barra (0–100). */
  closePct: number;
  /** Posición de "hoy" en la barra (0–100). */
  progressPct: number;
  statusText: string;
  /** `statusText` partido en dos para layouts de dos líneas: "CIERRA EN" / "42 días". */
  statusLabel: string;
  statusValue: string;
}

export function getPeriodTimeline(
  card: CardForPeriod,
  offsetMonths: number,
  opts?: { firstPeriodKey?: string }
): PeriodTimeline {
  const now = nowAr();
  const today = startOfDay(now);

  const period = getPeriodByOffset(card, offsetMonths);
  const prev = getPeriodByOffset(card, offsetMonths - 1);
  const close = period.end;
  const due = period.due;

  const hasPrev =
    !opts?.firstPeriodKey || period.key > opts.firstPeriodKey;
  const lastDue = hasPrev ? prev.due : null;

  // Borde izquierdo del eje: el último vencimiento, o el inicio del período
  // cuando no hay período previo (siempre anterior al cierre → eje válido).
  const left = lastDue ?? period.start;

  // "Alcanzado" = el hito ya quedó atrás (el día del hito todavía no cuenta:
  // la tarjeta cierra al final del día, el vencimiento es pagable hasta ese día).
  const lastDueReached = lastDue ? isAfter(today, startOfDay(lastDue)) : false;
  const closeReached = isAfter(today, startOfDay(close));
  const dueReached = isAfter(today, startOfDay(due));

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const span = due.getTime() - left.getTime();
  const rawClosePct =
    span > 0 ? ((close.getTime() - left.getTime()) / span) * 100 : 50;
  const closePct = Math.min(
    CLOSE_PCT_MAX,
    Math.max(CLOSE_PCT_MIN, rawClosePct)
  );

  // El avance se re-mapea a las posiciones visuales de los nodos (0 / closePct / 100).
  let progressPct: number;
  if (!closeReached) {
    progressPct =
      closePct *
      clamp01((now.getTime() - left.getTime()) / (close.getTime() - left.getTime()));
  } else if (!dueReached) {
    progressPct =
      closePct +
      (100 - closePct) *
        clamp01((now.getTime() - close.getTime()) / (due.getTime() - close.getTime()));
  } else {
    progressPct = 100;
  }

  // El header sigue la fecha de cierre actual; si ya cerró, cuenta al
  // vencimiento; si además venció, el período está cerrado.
  let statusText: string;
  let statusLabel: string;
  let statusValue: string;
  if (dueReached) {
    statusText = "Período cerrado";
    statusLabel = "Período";
    statusValue = "cerrado";
  } else {
    const [target, verb] = !closeReached ? [close, "Cierra"] : [due, "Vence"];
    const d = differenceInCalendarDays(startOfDay(target), today);
    if (d <= 0) {
      statusText = `${verb} hoy`;
      statusLabel = verb;
      statusValue = "hoy";
    } else if (d === 1) {
      statusText = `${verb} mañana`;
      statusLabel = verb;
      statusValue = "mañana";
    } else {
      statusText = `${verb} en ${d} días`;
      statusLabel = `${verb} en`;
      statusValue = `${d} días`;
    }
  }

  const highlightKey: "close" | "due" | null = dueReached
    ? null
    : closeReached
    ? "due"
    : "close";

  return {
    lastDue,
    close,
    due,
    lastDueReached,
    closeReached,
    dueReached,
    highlightKey,
    closePct: Math.round(closePct),
    progressPct: Math.round(progressPct),
    statusText,
    statusLabel,
    statusValue,
  };
}

/**
 * Parsea "YYYY-MM-DD" como fecha local (medianoche) sin conversión TZ.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Retorna el monto de una cuota específica (índice 0-based).
 * Si existe un override en installment_amounts lo usa; si no, usa installment_amount.
 */
export function getInstallmentAmountForIndex(
  expense: ExpenseForPeriod & { installment_amount: number },
  index: number
): number {
  if (expense.installment_amounts) {
    const override = expense.installment_amounts[String(index)];
    if (override !== undefined) return override;
  }
  return expense.installment_amount;
}

/**
 * Calcula el monto de la cuota que cae en un período específico.
 * Respeta montos individuales (installment_amounts) si existen.
 */
export function getAmountInPeriod(
  expense: ExpenseForPeriod & { installment_amount: number },
  period: Period
): number {
  const index = getInstallmentIndexInPeriod(expense, period);
  return index === -1 ? 0 : getInstallmentAmountForIndex(expense, index);
}

/**
 * Convierte un monto del consumo a su equivalente en pesos (ARS).
 * Si el consumo está en USD y tiene tipo de cambio, multiplica monto × TC.
 * Para ARS (o USD sin TC) devuelve el monto sin cambios.
 * Se usa SOLO para los totales que mezclan consumos de distintas monedas.
 */
export function toArs(
  expense: { currency?: string | null; exchange_rate?: number | null },
  amount: number
): number {
  if (expense.currency === "USD" && expense.exchange_rate) {
    return amount * Number(expense.exchange_rate);
  }
  return amount;
}

/**
 * Igual que getAmountInPeriod, pero devuelve el monto convertido a ARS.
 * Es la versión que deben usar todos los totales (saldos, cierres, vencimientos).
 */
export function getAmountInPeriodArs(
  expense: ExpenseForPeriod & { installment_amount: number },
  period: Period
): number {
  return toArs(expense, getAmountInPeriod(expense, period));
}

/** Resultado de aplicar un cambio de fechas de período a una tarjeta. */
export interface PeriodDatesUpdate {
  close_date: string;
  due_date: string;
  date_overrides: PeriodDateOverrides | null;
}

/**
 * Calcula el update a aplicar cuando el usuario carga nuevas fechas de
 * cierre/vencimiento para un período (edición del vigente o renovación).
 *
 * Las fechas nuevas rigen desde el período al que pertenece la nueva fecha de
 * cierre, y se replican hacia adelante (mismo día, mes +1 por período, con
 * ajuste a fin de mes y salto de año — eso lo resuelve buildPeriod). Las
 * fechas ANTERIORES quedan congeladas en date_overrides para los períodos
 * previos, que conservan así sus fechas históricas.
 *
 * Función pura — el server action persiste el resultado.
 */
export function applyPeriodDatesChange(
  card: CardForPeriod,
  newCloseDate: string,
  newDueDate: string
): PeriodDatesUpdate {
  const overrides: PeriodDateOverrides = { ...(card.date_overrides ?? {}) };

  const newClose = parseLocalDate(newCloseDate);
  const newKey = keyOf(newClose.getFullYear(), newClose.getMonth() + 1);

  // Las fechas nuevas rigen de newKey en adelante: cualquier override que
  // pretenda cubrir esos períodos queda obsoleto.
  for (const until of Object.keys(overrides)) {
    if (until >= newKey) delete overrides[until];
  }

  // Congelamos las fechas viejas para los períodos anteriores al editado,
  // solo si el día de cierre o vencimiento realmente cambió. Si ya existe un
  // override que cubre esos períodos (edición repetida del mismo período),
  // se conserva el histórico original.
  const oldCloseDay = parseLocalDate(card.close_date).getDate();
  const oldDueDay = parseLocalDate(card.due_date).getDate();
  const dayChanged =
    oldCloseDay !== newClose.getDate() ||
    oldDueDay !== parseLocalDate(newDueDate).getDate();

  if (dayChanged) {
    const untilKey = addMonthsToKey(newKey, -1);
    if (!overrides[untilKey]) {
      overrides[untilKey] = {
        close_date: card.close_date,
        due_date: card.due_date,
      };
    }
  }

  return {
    close_date: newCloseDate,
    due_date: newDueDate,
    date_overrides: Object.keys(overrides).length > 0 ? overrides : null,
  };
}
