/**
 * lib/vencimientos.ts
 *
 * Consolida los vencimientos de tarjetas y préstamos agrupados por mes
 * calendario, desde el mes actual hacia adelante (más los impagos vencidos).
 * Función pura — se alimenta de datos ya consultados. La usan tanto el
 * homepage (para el total general del acceso) como la pantalla /vencimientos.
 */
import { differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";
import {
  getInstallmentPeriod,
  getInstallmentAmountForIndex,
  getCurrentPeriod,
  getNextDuePeriod,
  getPeriodByOffset,
  getAmountInPeriodArs,
  toArs,
  parseLocalDate,
} from "@/lib/periods/calculate";
import { capitalize, formatDate } from "@/lib/utils";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

/**
 * Hasta cuántos meses hacia adelante proyectamos un consumo recurrente (sin
 * fin) al listar vencimientos. Las demás vistas (navegador de períodos) lo
 * resuelven on-demand, pero esta consolidación necesita un tope finito.
 */
const RECURRING_HORIZON_MONTHS = 12;

/** Diferencia en meses entre dos claves "YYYY-MM" (b - a). */
function monthsBetweenKeys(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

export interface CardVencimiento {
  kind: "card";
  cardId: string;
  name: string;
  lastFour: string;
  accent: string;
  due: Date;
  /**
   * Fecha de vencimiento como "YYYY-MM-DD". Se usa en los Client Components
   * para formatear en vez de `due`: un Date cruzando el borde server→client
   * queda anclado a la TZ del proceso que lo construyó (UTC en producción) y
   * se corre un día al leerlo con getters locales del navegador (Argentina).
   */
  dueDateKey: string;
  amount: number;
  daysUntil: number;
  overdue: boolean;
  /** Offset del período (en meses) respecto al período actual de la tarjeta. */
  offset: number;
  /** Clave "YYYY-MM" del período (mes de cierre), para marcar el pago. */
  periodKey: string;
}

export interface LoanVencimiento {
  kind: "loan";
  loanId: string;
  installmentId: string;
  name: string;
  accent: string;
  installmentNumber: number;
  totalInstallments: number;
  due: Date;
  /** Fecha de vencimiento como "YYYY-MM-DD" (ver comentario en CardVencimiento.dueDateKey). */
  dueDateKey: string;
  amount: number;
  daysUntil: number;
  overdue: boolean;
}

export interface MonthGroup {
  /** Clave estable "YYYY-MM" */
  key: string;
  /** Primer día del mes (para el label) */
  date: Date;
  /** true si es el mes en curso */
  isCurrent: boolean;
  cards: CardVencimiento[];
  loans: LoanVencimiento[];
  cardsTotal: number;
  loansTotal: number;
  total: number;
}

export interface UpcomingResult {
  months: MonthGroup[];
  grandTotal: number;
  cardsGrandTotal: number;
  loansGrandTotal: number;
}

interface ComputeParams {
  cards: Card[];
  expenses: Expense[];
  loans: Loan[];
  /** Cuotas de préstamo NO pagadas */
  pendingInstallments: LoanInstallment[];
  /** Cantidad total de cuotas por préstamo (para "Cuota X/N") */
  totalByLoan: Map<string, number>;
  /** Períodos de tarjeta ya marcados como pagados: set de "cardId:periodKey" */
  paidCardPeriods: Set<string>;
  now: Date;
}

export function computeUpcomingByMonth({
  cards,
  expenses,
  loans,
  pendingInstallments,
  totalByLoan,
  paidCardPeriods,
  now,
}: ComputeParams): UpcomingResult {
  const todayStart = startOfDay(now);
  const currentMonthKey = format(todayStart, "yyyy-MM");

  const monthMap = new Map<string, MonthGroup>();
  const getMonth = (d: Date): MonthGroup => {
    const key = format(d, "yyyy-MM");
    let g = monthMap.get(key);
    if (!g) {
      g = {
        key,
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        isCurrent: key === currentMonthKey,
        cards: [],
        loans: [],
        cardsTotal: 0,
        loansTotal: 0,
        total: 0,
      };
      monthMap.set(key, g);
    }
    return g;
  };

  // ── Tarjetas ───────────────────────────────────────────────────
  // Para cada tarjeta, agrupamos el saldo de cada período (cada cuota cae en su
  // período según la fecha de cierre) y lo mapeamos al mes en que vence.
  for (const card of cards) {
    const cardExpenses = expenses.filter((e) => e.card_id === card.id);
    const currentPeriodKey = getCurrentPeriod(card).key;
    const periodMap = new Map<string, { due: Date; total: number }>();
    for (const exp of cardExpenses) {
      // Recurrente: en vez de iterar las cuotas, proyectamos desde el período
      // actual de la tarjeta hacia adelante (hasta el horizonte). Para cuotas
      // normales recorremos cada cuota como siempre.
      let startI = 0;
      let endI = exp.installments;
      if (exp.recurring) {
        const baseKey = getInstallmentPeriod(card, exp, 0).key;
        // Anclamos al período con vencimiento más próximo aún no vencido, NO al
        // período "actual" por fecha de cierre: si hoy cae entre el cierre y el
        // vencimiento de un período (ej. cerró hace unos días pero vence en unos
        // días más), getCurrentPeriod ya avanzó al siguiente y ese período
        // quedaría afuera de la proyección, aunque su vencimiento no haya
        // pasado — el consumo recurrente desaparecería de ese vencimiento.
        const nextDueKey = getNextDuePeriod(card).key;
        startI = Math.max(0, monthsBetweenKeys(baseKey, nextDueKey));
        endI = startI + RECURRING_HORIZON_MONTHS;
      }
      for (let i = startI; i < endI; i++) {
        if (exp.excluded_installments?.includes(i)) continue;
        // Cada cuota queda anclada a "período de la compra + i meses": un
        // cambio de fechas del período no re-asigna cuotas ya cargadas.
        const period = getInstallmentPeriod(card, exp, i);
        const amount = toArs(exp, getInstallmentAmountForIndex(exp, i));
        const entry = periodMap.get(period.key) ?? { due: period.due, total: 0 };
        entry.total += amount;
        periodMap.set(period.key, entry);
      }
    }
    for (const [periodKey, { due, total }] of periodMap.entries()) {
      if (total <= 0) continue;
      const dueMonthKey = format(due, "yyyy-MM");
      // Los meses ya pasados se asumen pagados y no se listan. Los períodos
      // marcados manualmente como pagados tampoco (aunque sean actuales/futuros).
      if (dueMonthKey < currentMonthKey) continue;
      if (paidCardPeriods.has(`${card.id}:${periodKey}`)) continue;
      const g = getMonth(due);
      const daysUntil = differenceInCalendarDays(due, todayStart);
      const overdue = daysUntil < 0;
      g.cards.push({
        kind: "card",
        cardId: card.id,
        name: card.bank || card.name,
        lastFour: card.last_four,
        accent: card.color || "#6366f1",
        due,
        dueDateKey: format(due, "yyyy-MM-dd"),
        amount: total,
        daysUntil,
        overdue,
        offset: monthsBetweenKeys(currentPeriodKey, periodKey),
        periodKey,
      });
      g.cardsTotal += total;
      g.total += total;
    }
  }

  // ── Préstamos ──────────────────────────────────────────────────
  const loanById = new Map(loans.map((l) => [l.id, l]));
  for (const inst of pendingInstallments) {
    const loan = loanById.get(inst.loan_id);
    if (!loan) continue;
    const due = parseLocalDate(inst.due_date);
    const g = getMonth(due);
    const daysUntil = differenceInCalendarDays(due, todayStart);
    const overdue = daysUntil < 0;
    // Cuotas en USD: se suman convertidas a pesos con el TC efectivo de la cuota.
    const amount = toArs(
      { currency: loan.currency, exchange_rate: inst.exchange_rate },
      Number(inst.amount)
    );
    g.loans.push({
      kind: "loan",
      loanId: loan.id,
      installmentId: inst.id,
      name: loan.bank || loan.description,
      accent: loan.color || "#6366f1",
      installmentNumber: inst.installment_number,
      totalInstallments: totalByLoan.get(loan.id) ?? inst.installment_number,
      due,
      dueDateKey: inst.due_date,
      amount,
      daysUntil,
      overdue,
    });
    g.loansTotal += amount;
    g.total += amount;
  }

  const months = [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const m of months) {
    m.cards.sort(
      (a, b) => a.due.getTime() - b.due.getTime() || a.name.localeCompare(b.name)
    );
    m.loans.sort(
      (a, b) => a.due.getTime() - b.due.getTime() || a.name.localeCompare(b.name)
    );
  }

  const grandTotal = months.reduce((s, m) => s + m.total, 0);
  const cardsGrandTotal = months.reduce((s, m) => s + m.cardsTotal, 0);
  const loansGrandTotal = months.reduce((s, m) => s + m.loansTotal, 0);

  return { months, grandTotal, cardsGrandTotal, loansGrandTotal };
}

// ══════════════════════════════════════════════════════════════════
// DETALLE DE UN PERÍODO (pantalla /vencimientos/[month])
// ══════════════════════════════════════════════════════════════════

export type PeriodItemStatus = "paid" | "overdue" | "pending";

export interface PeriodDetailCard {
  cardId: string;
  name: string;
  lastFour: string;
  accent: string;
  /** Fecha de cierre del período de ESA tarjeta, "YYYY-MM-DD". */
  closeDateKey: string;
  /** Fecha de vencimiento del período de ESA tarjeta, "YYYY-MM-DD". */
  dueDateKey: string;
  /** Saldo del período (ARS). */
  amount: number;
  status: PeriodItemStatus;
  /** Clave "YYYY-MM" del período de cierre. */
  periodKey: string;
  /** Offset (meses) del período respecto al período actual de la tarjeta. */
  offset: number;
}

export interface PeriodDetailLoan {
  loanId: string;
  installmentId: string;
  name: string;
  accent: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDateKey: string;
  amount: number;
  status: PeriodItemStatus;
}

export interface PeriodDetailResult {
  monthKey: string;
  label: string;
  isCurrentMonth: boolean;
  cards: PeriodDetailCard[];
  loans: PeriodDetailLoan[];
  /** Totales de lo que FALTA pagar (excluye los ítems ya marcados como pagados). */
  cardsTotal: number;
  loansTotal: number;
  total: number;
  /** Suma de los ítems (tarjetas + cuotas) ya pagados en el período. */
  paidTotal: number;
  /** Mes vecino (con movimiento) anterior / siguiente, o null en los extremos. */
  prevKey: string | null;
  nextKey: string | null;
}

interface PeriodDetailParams {
  /** Mes de vencimiento, "YYYY-MM". */
  monthKey: string;
  cards: Card[];
  expenses: Expense[];
  loans: Loan[];
  /** TODAS las cuotas (pagadas y no) para poder mostrar estado y "Cuota X de N". */
  allInstallments: LoanInstallment[];
  /** Períodos de tarjeta marcados como pagados: set de "cardId:periodKey". */
  paidCardPeriods: Set<string>;
  now: Date;
}

/** Ventana de períodos que exploramos alrededor del actual de cada tarjeta. */
const DETAIL_PAST_MONTHS = 6;
const DETAIL_FUTURE_MONTHS = 18;

/**
 * Detalle de un período (mes de vencimiento): saldo de cada tarjeta cuyo período
 * vence en ese mes + cada cuota de préstamo que vence en ese mes, con su estado
 * (pagado / vencido / pendiente). A diferencia de `computeUpcomingByMonth`, acá
 * SÍ se listan los ítems ya pagados.
 */
export function computePeriodDetail({
  monthKey,
  cards,
  expenses,
  loans,
  allInstallments,
  paidCardPeriods,
  now,
}: PeriodDetailParams): PeriodDetailResult {
  const todayStart = startOfDay(now);
  const currentMonthKey = format(todayStart, "yyyy-MM");

  const totalByLoan = new Map<string, number>();
  for (const i of allInstallments) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }

  // Meses (de vencimiento) que tienen algún movimiento, para navegar ‹ ›.
  const monthsWithMovement = new Set<string>();

  const detailCards: PeriodDetailCard[] = [];
  for (const card of cards) {
    const cardExpenses = expenses.filter((e) => e.card_id === card.id);

    for (let off = -DETAIL_PAST_MONTHS; off <= DETAIL_FUTURE_MONTHS; off++) {
      const period = getPeriodByOffset(card, off);
      const amount = cardExpenses.reduce(
        (s, e) => s + getAmountInPeriodArs(e, period),
        0
      );
      if (amount <= 0) continue;

      const dueMonthKey = format(period.due, "yyyy-MM");
      monthsWithMovement.add(dueMonthKey);
      if (dueMonthKey !== monthKey) continue;

      const paid = paidCardPeriods.has(`${card.id}:${period.key}`);
      detailCards.push({
        cardId: card.id,
        name: card.bank || card.name,
        lastFour: card.last_four,
        accent: card.color || "#6366f1",
        closeDateKey: format(period.end, "yyyy-MM-dd"),
        dueDateKey: format(period.due, "yyyy-MM-dd"),
        amount,
        status: paid
          ? "paid"
          : isBefore(period.due, todayStart)
            ? "overdue"
            : "pending",
        periodKey: period.key,
        offset: off,
      });
    }
  }

  const loanById = new Map(loans.map((l) => [l.id, l]));
  const detailLoans: PeriodDetailLoan[] = [];
  for (const inst of allInstallments) {
    const loan = loanById.get(inst.loan_id);
    if (!loan) continue;

    const due = parseLocalDate(inst.due_date);
    const dueMonthKey = format(due, "yyyy-MM");
    monthsWithMovement.add(dueMonthKey);
    if (dueMonthKey !== monthKey) continue;

    const amount = toArs(
      { currency: loan.currency, exchange_rate: inst.exchange_rate },
      Number(inst.amount)
    );
    detailLoans.push({
      loanId: loan.id,
      installmentId: inst.id,
      name: loan.bank || loan.description,
      accent: loan.color || "#6366f1",
      installmentNumber: inst.installment_number,
      totalInstallments: totalByLoan.get(loan.id) ?? inst.installment_number,
      dueDateKey: inst.due_date,
      amount,
      status: inst.paid
        ? "paid"
        : isBefore(due, todayStart)
          ? "overdue"
          : "pending",
    });
  }

  detailCards.sort(
    (a, b) =>
      a.dueDateKey.localeCompare(b.dueDateKey) || a.name.localeCompare(b.name)
  );
  detailLoans.sort(
    (a, b) =>
      a.dueDateKey.localeCompare(b.dueDateKey) || a.name.localeCompare(b.name)
  );

  // Los totales representan el saldo pendiente: los ítems marcados como pagados
  // no suman (así "Total a pagar" baja al tildar un pago, igual que en la lista
  // de /vencimientos y el homepage).
  const cardsTotal = detailCards.reduce(
    (s, c) => s + (c.status === "paid" ? 0 : c.amount),
    0
  );
  const loansTotal = detailLoans.reduce(
    (s, l) => s + (l.status === "paid" ? 0 : l.amount),
    0
  );
  const paidTotal =
    detailCards.reduce((s, c) => s + (c.status === "paid" ? c.amount : 0), 0) +
    detailLoans.reduce((s, l) => s + (l.status === "paid" ? l.amount : 0), 0);

  monthsWithMovement.add(monthKey);
  const sortedMonths = [...monthsWithMovement].sort();
  const idx = sortedMonths.indexOf(monthKey);
  const prevKey = idx > 0 ? sortedMonths[idx - 1] : null;
  const nextKey =
    idx >= 0 && idx < sortedMonths.length - 1 ? sortedMonths[idx + 1] : null;

  return {
    monthKey,
    label: capitalize(formatDate(parseLocalDate(`${monthKey}-01`), "MMMM yyyy")),
    isCurrentMonth: monthKey === currentMonthKey,
    cards: detailCards,
    loans: detailLoans,
    cardsTotal,
    loansTotal,
    total: cardsTotal + loansTotal,
    paidTotal,
    prevKey,
    nextKey,
  };
}
