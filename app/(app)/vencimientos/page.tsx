import { ChevronRight } from "lucide-react";
import { format, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { computeUpcomingByMonth } from "@/lib/vencimientos";
import type { MonthGroup } from "@/lib/vencimientos";
import { LoanVencimientoRow } from "@/components/vencimientos/loan-vencimiento-row";
import { CardVencimientoRow } from "@/components/vencimientos/card-vencimiento-row";
import { capitalize, cn, formatDate, nowInArgentina } from "@/lib/utils";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Próximos vencimientos" };

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
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href="/" />
          <h1 className="font-display text-[20px] font-semibold text-foreground">
            Próximos vencimientos
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </StickyPageHeader>

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

          {/* Meses */}
          {(() => {
            // Comparamos cada mes contra el mes CALENDARIO anterior (por
            // clave), no contra la posición anterior del array: un mes sin
            // vencimientos pendientes (todo pagado) no aparece en `months`,
            // así que comparar por posición desplaza qué mes queda como
            // "anterior" y produce una variación espuria en el mes siguiente
            // cuando se marca algo como pagado.
            const totalByKey = new Map(months.map((m) => [m.key, m.total]));
            return (
              <div className="space-y-3">
                {months.map((m, i) => {
                  const prevKey = format(subMonths(m.date, 1), "yyyy-MM");
                  // El primer mes mostrado es siempre el actual: no hay mes
                  // anterior con el que comparar. Para el resto, si el mes
                  // calendario anterior no aparece en `months` es porque su
                  // saldo pendiente es $0 (todo pagado), no que no exista.
                  const prevTotal = i === 0 ? null : (totalByKey.get(prevKey) ?? 0);
                  return <MonthSection key={m.key} month={m} prevTotal={prevTotal} />;
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function MonthSection({ month, prevTotal }: { month: MonthGroup; prevTotal: number | null }) {
  const label = capitalize(formatDate(month.date, "MMMM yyyy"));
  // Abrimos por defecto el mes actual y cualquier mes con algo vencido.
  const defaultOpen = month.isCurrent || month.hasOverdue;

  return (
    <details
      open={defaultOpen}
      className={cn(
        "group overflow-hidden rounded-[18px] border bg-card",
        month.isCurrent ? "border-primary/40" : "border-border"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          <div className="min-w-0">
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
                  Este mes
                </span>
              )}
            </div>
            <MonthVariation total={month.total} prevTotal={prevTotal} />
          </div>
        </div>
        <Money
          amount={month.total}
          className="flex-shrink-0 text-[14px] font-bold tabular-nums text-foreground"
        />
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        {month.cards.length > 0 && (
          <Block
            label="Tarjetas"
            subtotal={month.cardsTotal}
            items={month.cards.map((c) => (
              <CardVencimientoRow key={`${c.cardId}:${c.periodKey}`} item={c} />
            ))}
          />
        )}
        {month.loans.length > 0 && (
          <Block
            label="Préstamos"
            subtotal={month.loansTotal}
            items={month.loans.map((l) => (
              <LoanVencimientoRow key={l.installmentId} item={l} />
            ))}
          />
        )}
      </div>
    </details>
  );
}

function Block({
  label,
  subtotal,
  items,
}: {
  label: string;
  subtotal: number;
  items: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-0.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </h3>
        <Money
          amount={subtotal}
          className="text-[11.5px] font-semibold tabular-nums text-foreground"
        />
      </div>
      <div className="space-y-2">{items}</div>
    </div>
  );
}

/** Formatea un monto sin signo ni decimales: "$15.300" / "$8.200" / "$0".
 *  El color y la flecha indican si subió o bajó. */
function formatAbsCurrency(diff: number): string {
  const abs = new Intl.NumberFormat("es-AR").format(Math.abs(Math.round(diff)));
  return `$${abs}`;
}

/** Formatea un porcentaje sin signo: "12,4%" / "6,1%" / "0,0%". */
function formatAbsPct(pct: number, decimals = 1): string {
  const abs = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(pct));
  return `${abs}%`;
}

/**
 * Variación del total del mes contra el mes anterior de la lista. Verde si
 * bajó, rojo si subió. Muestra el importe de la diferencia y luego el
 * porcentaje. No muestra nada en el primer mes ni cuando no hay cambios.
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

