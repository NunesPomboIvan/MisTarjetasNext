/**
 * lib/vencimientos.ts
 *
 * Consolida los vencimientos de tarjetas y préstamos agrupados por mes
 * calendario, desde el mes actual hacia adelante (más los impagos vencidos).
 * Función pura — se alimenta de datos ya consultados. La usan tanto el
 * homepage (para el total general del acceso) como la pantalla /vencimientos.
 */
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import {
  getInstallmentPeriod,
  getInstallmentAmountForIndex,
  getCurrentPeriod,
  toArs,
  parseLocalDate,
} from "@/lib/periods/calculate";
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
  amount: number;
  daysUntil: number;
  overdue: boolean;
  /** Offset del período (en meses) respecto al período actual de la tarjeta. */
  offset: number;
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
  /** true si tiene al menos un vencimiento ya vencido */
  hasOverdue: boolean;
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
  now: Date;
}

export function computeUpcomingByMonth({
  cards,
  expenses,
  loans,
  pendingInstallments,
  totalByLoan,
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
        hasOverdue: false,
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
        const currentKey = getCurrentPeriod(card).key;
        startI = Math.max(0, monthsBetweenKeys(baseKey, currentKey));
        endI = startI + RECURRING_HORIZON_MONTHS;
      }
      for (let i = startI; i < endI; i++) {
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
      // Las tarjetas no llevan registro de pago por período: los meses ya
      // pasados se asumen pagados y no se listan.
      if (dueMonthKey < currentMonthKey) continue;
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
        amount: total,
        daysUntil,
        overdue,
        offset: monthsBetweenKeys(currentPeriodKey, periodKey),
      });
      g.cardsTotal += total;
      g.total += total;
      if (overdue) g.hasOverdue = true;
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
      amount,
      daysUntil,
      overdue,
    });
    g.loansTotal += amount;
    g.total += amount;
    if (overdue) g.hasOverdue = true;
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
