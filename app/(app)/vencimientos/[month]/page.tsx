import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { computePeriodDetail } from "@/lib/vencimientos";
import { Children } from "react";
import { formatDate, nowInArgentina } from "@/lib/utils";
import { PeriodDetailNav } from "@/components/vencimientos/period-detail-nav";
import { PeriodCardRow } from "@/components/vencimientos/period-card-row";
import { PeriodLoanRow } from "@/components/vencimientos/period-loan-row";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Detalle de período" };

interface PeriodDetailPageProps {
  params: Promise<{ month: string }>;
}

export default async function PeriodDetailPage({ params }: PeriodDetailPageProps) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const [{ data: cards }, { data: expenses }, { data: loans }, { data: allInst }, { data: paidPeriods }] =
    await Promise.all([
      cardsQuery,
      supabase.from("expenses").select("*").eq("user_id", user!.id),
      loansQuery,
      supabase.from("loan_installments").select("*").eq("user_id", user!.id),
      supabase
        .from("card_period_payments")
        .select("card_id, period_key")
        .eq("user_id", user!.id)
        .eq("paid", true),
    ]);

  const paidCardPeriods = new Set(
    (paidPeriods ?? []).map((p) => `${p.card_id}:${p.period_key}`)
  );

  const today = nowInArgentina();
  // En los meses posteriores al actual las fechas de cierre/vencimiento de las
  // tarjetas todavía no se conocen (son proyectadas): no se muestran.
  const isFutureMonth = month > formatDate(today, "yyyy-MM");

  const detail = computePeriodDetail({
    monthKey: month,
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    allInstallments: (allInst ?? []) as LoanInstallment[],
    paidCardPeriods,
    now: today,
  });

  const isEmpty = detail.cards.length === 0 && detail.loans.length === 0;

  return (
    <div className="space-y-5">
      <PeriodDetailNav
        label={detail.label}
        prevKey={detail.prevKey}
        nextKey={detail.nextKey}
        isCurrentMonth={detail.isCurrentMonth}
      >
        <p className="text-[12px] font-medium text-muted-foreground">
          {detail.paidTotal > 0 ? "Falta pagar" : "Total a pagar"}
        </p>
        <Money
          amount={detail.total}
          className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
        />
        <div className="mt-2 flex items-center gap-4 text-[11.5px] text-muted-foreground">
          <span>
            Tarjetas{" "}
            <Money
              amount={detail.cardsTotal}
              className="font-semibold tabular-nums text-foreground"
            />
          </span>
          <span>
            Préstamos{" "}
            <Money
              amount={detail.loansTotal}
              className="font-semibold tabular-nums text-foreground"
            />
          </span>
        </div>
        {detail.paidTotal > 0 && (
          <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            Ya pagaste{" "}
            <Money amount={detail.paidTotal} className="font-semibold tabular-nums" />
          </p>
        )}
      </PeriodDetailNav>

      {isEmpty ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin movimientos"
          description="Este período no tiene tarjetas ni cuotas por pagar"
        />
      ) : (
        <div className="space-y-4">
          {detail.cards.length > 0 && (
            <PeriodBlock>
              {detail.cards.map((c) => (
                <PeriodCardRow key={`${c.cardId}:${c.periodKey}`} item={c} showDates={!isFutureMonth} />
              ))}
            </PeriodBlock>
          )}
          {detail.loans.length > 0 && (
            <PeriodBlock>
              {detail.loans.map((l) => (
                <PeriodLoanRow key={l.installmentId} item={l} />
              ))}
            </PeriodBlock>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Bloque de filas (tarjetas o préstamos) separadas por una línea, con el mismo
 * estilo que el listado de períodos. Sin título: los subtotales ya están en el
 * resumen de arriba.
 */
function PeriodBlock({ children }: { children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-[20px] px-4">
      {Children.toArray(children).map((child, i) => (
        <div key={i}>
          {i > 0 && <div className="h-px bg-border dark:bg-white/[0.16]" />}
          {child}
        </div>
      ))}
    </section>
  );
}
