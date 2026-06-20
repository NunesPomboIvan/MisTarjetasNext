import Link from "next/link";
import { Calendar, Banknote, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { computeUpcomingByMonth } from "@/lib/vencimientos";
import type { CardVencimiento, LoanVencimiento, MonthGroup } from "@/lib/vencimientos";
import { capitalize, cn, formatDate, formatLongDate, nowInArgentina } from "@/lib/utils";
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

  const [{ data: cards }, { data: expenses }, { data: loans }, { data: pendingInst }, { data: allInst }] =
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
    ]);

  const totalByLoan = new Map<string, number>();
  for (const i of allInst ?? []) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }

  const { months, grandTotal, cardsGrandTotal, loansGrandTotal } = computeUpcomingByMonth({
    cards: (cards ?? []) as Card[],
    expenses: (expenses ?? []) as Expense[],
    loans: (loans ?? []) as Loan[],
    pendingInstallments: (pendingInst ?? []) as LoanInstallment[],
    totalByLoan,
    now: nowInArgentina(),
  });

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
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
          <div className="space-y-3">
            {months.map((m, i) => (
              <MonthSection
                key={m.key}
                month={m}
                prevTotal={i > 0 ? months[i - 1].total : null}
              />
            ))}
          </div>
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
        <div className="flex min-w-0 items-start gap-2">
          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
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
              <VencimientoRow key={c.cardId} item={c} />
            ))}
          />
        )}
        {month.loans.length > 0 && (
          <Block
            label="Préstamos"
            subtotal={month.loansTotal}
            items={month.loans.map((l) => (
              <VencimientoRow key={l.installmentId} item={l} />
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

function dueText(item: CardVencimiento | LoanVencimiento): { text: string; tone: "muted" | "amber" | "red" } {
  if (item.overdue) {
    const d = Math.abs(item.daysUntil);
    return { text: `Venció hace ${d} día${d === 1 ? "" : "s"}`, tone: "red" };
  }
  if (item.daysUntil === 0) return { text: "Vence hoy", tone: "amber" };
  if (item.daysUntil <= 3) return { text: `Vence en ${item.daysUntil} días`, tone: "amber" };
  return { text: `Vence el ${formatLongDate(item.due)}`, tone: "muted" };
}

/** Formatea un monto con signo, sin decimales: "+$15.300" / "-$8.200" / "$0". */
function formatSignedCurrency(diff: number): string {
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  const abs = new Intl.NumberFormat("es-AR").format(Math.abs(Math.round(diff)));
  return `${sign}$${abs}`;
}

/** Formatea un porcentaje con signo: "+12,4%" / "-6,1%" / "0,0%". */
function formatSignedPct(pct: number, decimals = 1): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  const abs = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(pct));
  return `${sign}${abs}%`;
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
      {down ? "↓" : "↑"} {formatSignedCurrency(diff)}
      {prevTotal !== 0 ? ` · ${formatSignedPct(pct, 2)}` : ""}
    </p>
  );
}

/**
 * Comparación del monto del vencimiento contra el mismo mes anterior de la
 * tarjeta. Verde si bajó, rojo si subió, gris si es igual.
 */
function MonthOverMonthDiff({ amount, prevAmount }: { amount: number; prevAmount: number }) {
  const diff = amount - prevAmount;
  const pct = (diff / prevAmount) * 100;
  const toneClass =
    diff < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : diff > 0
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <p className={cn("mt-0.5 text-[10.5px] font-semibold tabular-nums", toneClass)}>
      {formatSignedCurrency(diff)} · {formatSignedPct(pct)}
    </p>
  );
}

function VencimientoRow({ item }: { item: CardVencimiento | LoanVencimiento }) {
  const accent = item.accent || "#6366f1";
  const { text, tone } = dueText(item);
  const toneClass =
    tone === "red"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-500"
        : "text-muted-foreground";

  const href =
    item.kind === "card"
      ? `/cards/${item.cardId}${item.offset ? `?offset=${item.offset}` : ""}`
      : `/prestamos/${item.loanId}`;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[14px] border bg-background/40 px-3 py-2.5 transition-all active:scale-[0.99]",
        item.overdue ? "border-destructive/40" : "border-border"
      )}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}20`, color: accent }}
      >
        {item.kind === "card" ? (
          <Calendar className="h-4 w-4" />
        ) : (
          <Banknote className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-foreground">
          {item.name}
          {item.kind === "card" && item.lastFour && (
            <span className="ml-1.5 text-[11.5px] font-normal tabular-nums text-muted-foreground">
              •••• {item.lastFour}
            </span>
          )}
        </p>
        {item.kind === "loan" && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cuota {item.installmentNumber}/{item.totalInstallments}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <Money
          amount={item.amount}
          className="block text-[14px] font-semibold tabular-nums text-foreground"
        />
        {item.kind === "card" && item.prevAmount != null && (
          <MonthOverMonthDiff amount={item.amount} prevAmount={item.prevAmount} />
        )}
        <p className={cn("mt-0.5 text-[10.5px] font-semibold", toneClass)}>{text}</p>
      </div>
    </Link>
  );
}
