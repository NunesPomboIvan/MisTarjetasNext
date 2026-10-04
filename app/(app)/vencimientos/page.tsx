import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import {
  computeMonthlyTotals,
  computeUpcomingByMonth,
  monthOverMonthChange,
  shiftMonthKey,
} from "@/lib/vencimientos";
import type { MonthGroup } from "@/lib/vencimientos";
import { capitalize, cn, formatDate, nowInArgentina } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
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

  const allInstallments = (allInst ?? []) as LoanInstallment[];
  const totalByLoan = new Map<string, number>();
  for (const i of allInstallments) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }

  const paidCardPeriods = new Set(
    (paidPeriods ?? []).map((p) => `${p.card_id}:${p.period_key}`)
  );

  const today = nowInArgentina();
  const { months, cardsGrandTotal, loansGrandTotal } = computeUpcomingByMonth({
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    pendingInstallments: allInstallments.filter((i) => !i.paid),
    totalByLoan,
    paidCardPeriods,
    now: today,
  });

  // Total bruto (incluye lo pagado) de cada mes: alimenta el gráfico y la
  // variación contra el mes anterior de cada fila.
  const monthlyTotals = computeMonthlyTotals({
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    allInstallments,
  });
  const currentKey = formatDate(today, "yyyy-MM");
  const chartBars: ChartBar[] = [];
  for (let d = -CHART_PAST; d <= CHART_FUTURE; d++) {
    const key = shiftMonthKey(currentKey, d);
    const total = monthlyTotals.get(key) ?? 0;
    if (total > 0) chartBars.push({ key, total, when: d < 0 ? "past" : d === 0 ? "current" : "future" });
  }

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
    <section className="glass-card mt-2 rounded-[20px] px-5 pb-1">
      {/* Pendiente de tarjetas y de préstamos del rango mostrado, como
          encabezado del listado */}
      <div className="pb-7 pt-[18px]">
        <div className="flex items-baseline justify-between gap-3 text-[12px] text-muted-foreground">
          <TotalPart label="Tarjetas" amount={cardsGrandTotal} />
          <TotalPart label="Préstamos" amount={loansGrandTotal} />
        </div>
        {chartBars.length > 0 && <PeriodsChart bars={chartBars} />}
      </div>

      {/* Períodos: cada uno es una fila navegable al detalle */}
      {/* El primer período del listado no muestra variación. */}
      {months.map((m, i) => (
        <div key={m.key}>
          <div className="h-px bg-border dark:bg-white/[0.16]" />
          <PeriodRow month={m} change={i === 0 ? null : monthOverMonthChange(monthlyTotals, m.key)} />
        </div>
      ))}
    </section>
  );
}

/** Meses antes / después del actual que muestra el gráfico. */
const CHART_PAST = 5;
const CHART_FUTURE = 2;

interface ChartBar {
  key: string;
  total: number;
  when: "past" | "current" | "future";
}

/**
 * Mini gráfico de barras: total de cada período (tarjetas + préstamos),
 * proporcional al mayor de los visibles. Todo en azul francés: pasados más
 * tenues, actual pleno y futuros (proyectados) punteados sin relleno. Cada barra navega
 * al detalle del período.
 */
function PeriodsChart({ bars }: { bars: ChartBar[] }) {
  const max = Math.max(...bars.map((b) => b.total));
  return (
    <div className="mt-5 flex gap-1.5" aria-label="Totales por período">
      {bars.map((b) => {
        const month = capitalize(formatDate(parseLocalDate(`${b.key}-01`), "MMM")).replace(".", "");
        return (
          <Link
            key={b.key}
            href={`/vencimientos/${b.key}`}
            aria-label={capitalize(formatDate(parseLocalDate(`${b.key}-01`), "MMMM yyyy"))}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex h-[54px] w-full items-end">
              <div
                className={cn(
                  "w-full rounded-t-[4px]",
                  b.when === "past" && "bg-primary/50",
                  b.when === "current" && "bg-primary",
                  b.when === "future" && "border border-b-0 border-dashed border-primary"
                )}
                style={{ height: `${Math.max((b.total / max) * 100, 4)}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[10.5px] leading-none",
                b.when === "current"
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              )}
            >
              {month}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** "↑ 14%" / "↓ 9%". */
function changeLabel(change: number): string {
  return `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}%`;
}

function PeriodRow({ month, change }: { month: MonthGroup; change: number | null }) {
  const label = capitalize(formatDate(month.date, "MMMM yyyy"));
  // El período actual se resalta con negrita y el badge "Actual".
  const weight = month.isCurrent ? "font-bold" : "font-semibold";
  return (
    <Link
      href={`/vencimientos/${month.key}`}
      className="flex w-full items-center gap-3 py-4 text-left"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("truncate text-[14px] leading-tight text-foreground", weight)}>
          {label}
        </span>
        {/* Variación contra el mes anterior: subir es rojo, bajar verde; sin
            diferencia no se muestra. */}
        {change !== null && change !== 0 && (
          <span
            className={cn(
              "flex-shrink-0 text-[12px] font-medium leading-tight tabular-nums",
              change > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {changeLabel(change)}
          </span>
        )}
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

/** Pendiente de un tipo: "Tarjetas: $ X". */
function TotalPart({ label, amount }: { label: string; amount: number }) {
  return (
    <span className="min-w-0 truncate">
      {label}:{" "}
      <Money amount={amount} className="font-semibold tabular-nums text-foreground" />
    </span>
  );
}
