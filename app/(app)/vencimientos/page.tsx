import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { format, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { StackHeader } from "@/components/shared/stack-header";
import { computeUpcomingByMonth } from "@/lib/vencimientos";
import type { MonthGroup } from "@/lib/vencimientos";
import { capitalize, cn, formatDate, nowInArgentina } from "@/lib/utils";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Resumen de Períodos" };

export default async function VencimientosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false);
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [{ data: cards }, { data: expenses }, { data: loans }, { data: pendingInst }, { data: allInst }, { data: paidPeriods }] =
    await Promise.all([
      cardsQuery,
      supabase.from("expenses").select("*").eq("user_id", user!.id),
      loansQuery,
      supabase
        .from("loan_installments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("paid", false),
      supabase.from("loan_installments").select("loan_id").eq("user_id", user!.id),
      supabase
        .from("card_period_payments")
        .select("card_id, period_key")
        .eq("user_id", user!.id)
        .eq("paid", true),
    ]);

  const totalByLoan = new Map<string, number>();
  for (const i of allInst ?? []) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }

  const paidCardPeriods = new Set(
    (paidPeriods ?? []).map((p) => `${p.card_id}:${p.period_key}`)
  );

  const { months, grandTotal, cardsGrandTotal, loansGrandTotal } = computeUpcomingByMonth({
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    pendingInstallments: (pendingInst ?? []) as LoanInstallment[],
    totalByLoan,
    paidCardPeriods,
    now: nowInArgentina(),
  });

  return (
    <div className="space-y-5">
      <StackHeader
        title="Resumen de Períodos"
        titleClassName="font-display text-[20px] font-semibold text-foreground"
        backHref="/"
      />

      {months.length === 0 ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin vencimientos próximos"
          description="No tenés tarjetas ni cuotas de préstamos por vencer"
        />
      ) : (
        <>
          {/* Total general del rango mostrado */}
          <section className="glass-card rounded-[20px] px-5 py-[18px]">
            <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
            <Money
              amount={grandTotal}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
            />
            <div className="mt-2 flex items-center gap-4 text-[11.5px] text-muted-foreground">
              <span>
                Tarjetas{" "}
                <Money
                  amount={cardsGrandTotal}
                  className="font-semibold tabular-nums text-foreground"
                />
              </span>
              <span>
                Préstamos{" "}
                <Money
                  amount={loansGrandTotal}
                  className="font-semibold tabular-nums text-foreground"
                />
              </span>
            </div>
          </section>

          {/* Períodos: cada uno es una fila navegable al detalle */}
          {(() => {
            // Variación contra el mes CALENDARIO anterior (por clave), no contra
            // la posición previa del array: un mes sin saldo pendiente no aparece
            // en `months`, y comparar por posición produciría variaciones espurias.
            const totalByKey = new Map(months.map((m) => [m.key, m.total]));
            return (
              <div className="space-y-2.5">
                {months.map((m, i) => {
                  const prevKey = format(subMonths(m.date, 1), "yyyy-MM");
                  const prevTotal = i === 0 ? null : (totalByKey.get(prevKey) ?? 0);
                  return <PeriodRow key={m.key} month={m} prevTotal={prevTotal} />;
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function PeriodRow({ month, prevTotal }: { month: MonthGroup; prevTotal: number | null }) {
  const label = capitalize(formatDate(month.date, "MMMM yyyy"));

  const parts: string[] = [];
  if (month.cards.length > 0) {
    parts.push(`${month.cards.length} ${month.cards.length === 1 ? "tarjeta" : "tarjetas"}`);
  }
  if (month.loans.length > 0) {
    parts.push(`${month.loans.length} ${month.loans.length === 1 ? "préstamo" : "préstamos"}`);
  }

  return (
    <Link
      href={`/vencimientos/${month.key}`}
      className={cn(
        "flex items-center gap-3 rounded-[18px] border px-4 py-3.5 transition-transform active:scale-[0.99]",
        month.hasOverdue
          ? "border-destructive/40 bg-card"
          : month.isCurrent
            ? "border-primary/40 bg-card"
            : "border-border bg-card/70"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-2.5 w-2.5 flex-shrink-0 rounded-full",
          month.hasOverdue
            ? "bg-destructive"
            : month.isCurrent
              ? "bg-primary"
              : "bg-amber-500/80"
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-[14px] font-bold",
              month.isCurrent ? "text-primary" : "text-foreground"
            )}
          >
            {label}
          </span>
          {month.isCurrent && (
            <span className="flex-shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Actual
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <p className="truncate text-[11.5px] text-muted-foreground">
            {parts.join(" · ")}
          </p>
          <Money
            amount={month.total}
            className="flex-shrink-0 text-[14px] font-bold tabular-nums text-foreground"
          />
        </div>
        <MonthVariation total={month.total} prevTotal={prevTotal} />
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Formatea un monto sin signo ni decimales: "$15.300" / "$0". */
function formatAbsCurrency(diff: number): string {
  const abs = new Intl.NumberFormat("es-AR").format(Math.abs(Math.round(diff)));
  return `$${abs}`;
}

/** Formatea un porcentaje sin signo: "12,40%". */
function formatAbsPct(pct: number, decimals = 1): string {
  const abs = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(pct));
  return `${abs}%`;
}

/**
 * Variación del total del mes contra el mes anterior. Verde si bajó, rojo si
 * subió. No muestra nada en el primer mes ni cuando no hay cambios.
 */
function MonthVariation({ total, prevTotal }: { total: number; prevTotal: number | null }) {
  if (prevTotal == null) return null;
  const diff = total - prevTotal;
  if (diff === 0) return null;
  const down = diff < 0;
  const toneClass = down
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-destructive";
  const pct = prevTotal !== 0 ? (diff / prevTotal) * 100 : 0;
  return (
    <p className={cn("mt-0.5 text-[11px] font-semibold tabular-nums", toneClass)}>
      {down ? "↓" : "↑"} {formatAbsCurrency(diff)}
      {prevTotal !== 0 && (
        <>
          <span className="text-muted-foreground"> · </span>
          {formatAbsPct(pct, 2)}
        </>
      )}
    </p>
  );
}
