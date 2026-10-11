import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { computePeriodDetail } from "@/lib/vencimientos";
import { Children, isValidElement } from "react";
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

  const rows = [
    ...(detail.cards.length > 0
      ? [
          <SectionTitle key="cards-title" first>Tarjetas</SectionTitle>,
          ...detail.cards.map((c) => (
            <PeriodCardRow
              key={`${c.cardId}:${c.periodKey}`}
              item={c}
              showDates={!isFutureMonth}
              hidePaidAmount={detail.isCurrentMonth}
            />
          )),
        ]
      : []),
    ...(detail.loans.length > 0
      ? [
          <SectionTitle key="loans-title" first={detail.cards.length === 0}>Préstamos</SectionTitle>,
          ...detail.loans.map((l) => (
            <PeriodLoanRow
              key={l.installmentId}
              item={l}
              hidePaidAmount={detail.isCurrentMonth}
            />
          )),
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PeriodBlock>
        <PeriodDetailNav
          label={detail.label}
          prevKey={detail.prevKey}
          nextKey={detail.nextKey}
          isCurrentMonth={detail.isCurrentMonth}
        >
          {/* Sin total general (ya está en el listado de períodos): solo el
              desglose, con el mismo estilo que en esa pantalla. */}
          <div className="flex items-baseline justify-between gap-3 text-[12px] text-muted-foreground">
            <span className="min-w-0 truncate">
              Tarjetas:{" "}
              <Money
                amount={detail.cardsTotal}
                className="font-semibold tabular-nums text-foreground"
              />
            </span>
            <span className="min-w-0 truncate">
              Préstamos:{" "}
              <Money
                amount={detail.loansTotal}
                className="font-semibold tabular-nums text-foreground"
              />
            </span>
          </div>
          {/* En el Resumen (período actual) no figura el importe de lo ya pagado. */}
          {!detail.isCurrentMonth && detail.paidTotal > 0 && (
            <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              Ya pagaste{" "}
              <Money amount={detail.paidTotal} className="font-semibold tabular-nums" />
            </p>
          )}
        </PeriodDetailNav>
        {rows}
      </PeriodBlock>

      {rows.length === 0 && (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin movimientos"
          description="Este período no tiene tarjetas ni cuotas por pagar"
        />
      )}
    </div>
  );
}

/**
 * Card única del detalle: encabezado, tarjetas y préstamos separados por una
 * línea, con el mismo estilo que el listado de períodos. Un título de sección
 * no lleva línea arriba: solo la que lo separa de sus filas.
 */
function PeriodBlock({ children }: { children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-[20px] px-4">
      {Children.toArray(children).map((child, i) => {
        const isTitle = isValidElement(child) && child.type === SectionTitle;
        return (
          <div key={i}>
            {i > 0 && !isTitle && <div className="h-px bg-border dark:bg-white/[0.16]" />}
            {child}
          </div>
        );
      })}
    </section>
  );
}

/** `first`: va pegado al encabezado del período, con menos aire arriba. */
function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <h2 className={`pb-2 ${first ? "-mt-2.5" : "pt-5"} font-display text-[15px] font-bold text-foreground`}>
      {children}
    </h2>
  );
}
