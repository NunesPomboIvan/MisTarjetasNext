import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { Money } from "@/components/shared/money";
import { ExpenseDetailActions } from "@/components/expenses/expense-detail-actions";
import { ExchangeRateOverride } from "@/components/expenses/exchange-rate-override";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { getCurrentPeriod, getInstallmentPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, formatCurrency } from "@/lib/utils";
import type { ExpenseWithAll } from "@/lib/supabase/database.types";

export const metadata = { title: "Detalle del consumo" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card_id?: string; installment?: string }>;
}

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { card_id, installment } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards(*)")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!data) notFound();

  const expense = data as ExpenseWithAll;
  const cat = expense.category;
  const card = expense.card;
  const globalRate =
    expense.currency === "USD" ? await getGlobalExchangeRate() : null;

  const backHref = card_id ? `/cards/${card_id}` : "/expenses";
  const editParams = new URLSearchParams();
  if (card_id) editParams.set("card_id", card_id);
  if (installment !== undefined) editParams.set("installment", installment);
  const editHref = editParams.toString()
    ? `/expenses/${expense.id}/edit?${editParams.toString()}`
    : `/expenses/${expense.id}/edit`;

  const installmentIdx =
    installment !== undefined ? parseInt(installment, 10) : undefined;

  // Link a la tarjeta apuntando al período de este consumo (no al actual):
  // calculamos el período de la cuota (o de la compra, si no viene installment)
  // y lo expresamos como offset de meses respecto al período actual de la tarjeta.
  let cardHref: string | undefined;
  if (card) {
    const expensePeriod = getInstallmentPeriod(card, expense, installmentIdx ?? 0);
    const currentPeriod = getCurrentPeriod(card);
    const [expYear, expMonth] = expensePeriod.key.split("-").map(Number);
    const [curYear, curMonth] = currentPeriod.key.split("-").map(Number);
    const offset = (expYear - curYear) * 12 + (expMonth - curMonth);
    cardHref = offset === 0 ? `/cards/${card.id}` : `/cards/${card.id}?offset=${offset}`;
  }

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href={backHref} />
          <h1 className="text-[15px] font-semibold text-foreground">
            Detalle del consumo
          </h1>
          <span className="h-10 w-10" />
        </div>
      </StickyPageHeader>

      {/* Resumen */}
      <section className="rounded-[20px] border border-border bg-card p-5 text-center shadow-sm">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] text-[34px]"
          style={
            cat
              ? {
                  background: `radial-gradient(130% 130% at 32% 24%, #ffffff 0%, ${cat.color_bg} 72%, ${cat.color_bg} 100%)`,
                  boxShadow: `0 6px 16px -3px rgba(0,0,0,0.40), 0 3px 8px ${cat.color_text}40, inset 0 1px 1.5px rgba(255,255,255,0.95), inset 0 -2px 5px ${cat.color_text}26`,
                }
              : {
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }
          }
        >
          <span style={cat ? { filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.28))" } : undefined}>
            {cat?.emoji ?? "•"}
          </span>
        </div>
        <p className="mt-3 text-[17px] font-semibold text-foreground">
          {expense.description}
        </p>
        <Money
          amount={expense.total_amount}
          currency={expense.currency}
          className="mt-1 block font-display text-[26px] font-bold tracking-tight text-foreground"
        />
        {expense.recurring ? (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Se repite todos los meses
          </p>
        ) : expense.installments > 1 ? (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {expense.installments} cuotas de{" "}
            {formatCurrency(expense.installment_amount, expense.currency)}
          </p>
        ) : null}
        {expense.currency === "USD" && expense.exchange_rate && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            ≈{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(expense.total_amount * expense.exchange_rate)}
            </span>{" "}
            en pesos · TC {formatCurrency(expense.exchange_rate)}
            {expense.exchange_rate_custom && (
              <span className="ml-1 text-amber-500" title="TC personalizado">
                🔒
              </span>
            )}
          </p>
        )}
      </section>

      {/* Tipo de cambio: general vs personalizado */}
      {expense.currency === "USD" && expense.exchange_rate && (
        <ExchangeRateOverride
          expenseId={expense.id}
          amountUsd={expense.total_amount}
          rate={Number(expense.exchange_rate)}
          custom={!!expense.exchange_rate_custom}
          globalRate={globalRate?.rate ?? null}
        />
      )}

      {/* Detalle */}
      <section className="overflow-hidden rounded-[18px] border border-border bg-card">
        <DetailRow
          label="Tarjeta"
          value={card ? `${card.name} •••• ${card.last_four}` : "—"}
          href={cardHref}
        />
        <DetailRow
          label="Categoría"
          value={cat ? `${cat.emoji ?? ""} ${cat.name}`.trim() : "Sin categoría"}
        />
        <DetailRow
          label="Fecha"
          value={capitalize(
            formatDate(expense.expense_date + "T00:00:00", "d 'de' MMMM yyyy")
          )}
        />
        <DetailRow
          label={expense.recurring ? "Tipo" : "Cuotas"}
          value={
            expense.recurring
              ? "Fijo mensual (todos los meses)"
              : expense.installments > 1
                ? installmentIdx !== undefined && installmentIdx >= 0
                  ? `Cuota ${installmentIdx + 1} de ${expense.installments}`
                  : `${expense.installments} cuotas`
                : "Pago único"
          }
        />
        {expense.discount_percentage != null &&
          expense.discount_percentage > 0 && (
            <DetailRow
              label="Descuento"
              value={`${expense.discount_percentage}%${
                expense.discount_cap != null
                  ? ` (tope ${formatCurrency(expense.discount_cap)})`
                  : ""
              }`}
            />
          )}
        {expense.notes && <DetailRow label="Notas" value={expense.notes} />}
        {expense.tags && expense.tags.length > 0 && (
          <DetailRow label="Tags" value={expense.tags.map((t) => `#${t}`).join(" ")} />
        )}
      </section>

      <ExpenseDetailActions
        expenseId={expense.id}
        cardId={expense.card_id}
        editHref={editHref}
        backHref={backHref}
        description={expense.description}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="flex max-w-[60%] items-center justify-end gap-1 text-right text-[14px] font-medium text-foreground">
        {value}
        {href && (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 active:bg-muted/40"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
      {inner}
    </div>
  );
}
