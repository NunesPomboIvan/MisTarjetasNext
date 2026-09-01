import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { computePeriodDetail } from "@/lib/vencimientos";
import { nowInArgentina } from "@/lib/utils";
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

  const detail = computePeriodDetail({
    monthKey: month,
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    allInstallments: (allInst ?? []) as LoanInstallment[],
    paidCardPeriods,
    now: nowInArgentina(),
  });

  const isEmpty = detail.cards.length === 0 && detail.loans.length === 0;

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-3">
          <BackButton href="/vencimientos" />
          <div className="h-10 w-10 shrink-0" aria-hidden />
        </div>
      </StickyPageHeader>

      <PeriodDetailNav
        label={detail.label}
        prevKey={detail.prevKey}
        nextKey={detail.nextKey}
        isCurrentMonth={detail.isCurrentMonth}
      >
        <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
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
            <PeriodBlock label="Tarjetas" subtotal={detail.cardsTotal}>
              {detail.cards.map((c) => (
                <PeriodCardRow key={`${c.cardId}:${c.periodKey}`} item={c} />
              ))}
            </PeriodBlock>
          )}
          {detail.loans.length > 0 && (
            <PeriodBlock label="Préstamos" subtotal={detail.loansTotal}>
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

function PeriodBlock({
  label,
  subtotal,
  children,
}: {
  label: string;
  subtotal: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </h2>
        <Money
          amount={subtotal}
          className="text-[11.5px] font-semibold tabular-nums text-foreground"
        />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
