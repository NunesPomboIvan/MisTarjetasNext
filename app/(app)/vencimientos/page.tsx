import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
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

  if (months.length === 0) {
    return (
      <EmptyState
        icon={<span>📅</span>}
        title="Sin vencimientos próximos"
        description="No tenés tarjetas ni cuotas de préstamos por vencer"
      />
    );
  }

  return (
    // Total y períodos en un único bloque, con el estilo de la lista de
    // "Últimos consumos" de la home.
    <section className="glass-card rounded-[20px] px-5 pb-1">
      {/* Desglose y total general del rango mostrado, como encabezado del listado */}
      <div className="pb-3.5 pt-[18px]">
        <div className="flex items-baseline justify-between gap-3 text-[12px] text-muted-foreground">
          <TotalPart label="Tarjetas" amount={cardsGrandTotal} />
          <TotalPart label="Préstamos" amount={loansGrandTotal} />
        </div>
        <Money
          amount={grandTotal}
          className="mt-2.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
        />
      </div>

      {/* Períodos: cada uno es una fila navegable al detalle */}
      {months.map((m) => (
        <div key={m.key}>
          <div className="h-px bg-border dark:bg-white/[0.16]" />
          <PeriodRow month={m} />
        </div>
      ))}
    </section>
  );
}

function PeriodRow({ month }: { month: MonthGroup }) {
  const label = capitalize(formatDate(month.date, "MMMM yyyy"));
  // El período actual se resalta con negrita y el badge "Actual".
  const weight = month.isCurrent ? "font-bold" : "font-semibold";
  return (
    <Link
      href={`/vencimientos/${month.key}`}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("truncate text-[14px] leading-tight text-foreground", weight)}>
          {label}
        </span>
        {month.isCurrent && (
          <span className="flex-shrink-0 rounded-full border border-foreground/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground">
            Actual
          </span>
        )}
      </div>
      <Money
        amount={month.total}
        className={cn("flex-shrink-0 text-[14px] leading-tight tabular-nums text-foreground", weight)}
      />
    </Link>
  );
}

/** Parte del desglose del total: "Tarjetas: $ X". */
function TotalPart({ label, amount }: { label: string; amount: number }) {
  return (
    <span className="min-w-0 truncate">
      {label}:{" "}
      <Money amount={amount} className="font-semibold tabular-nums text-foreground" />
    </span>
  );
}
