import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PeriodNavigator } from "@/components/cards/period-navigator";
import { PeriodProgress } from "@/components/cards/period-progress";
import { WalletCard } from "@/components/cards/wallet-card";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPeriodByOffset,
  expenseFallsInPeriod,
  getInstallmentIndexInPeriod,
  getAmountInPeriod,
  isCurrentPeriodExpired,
} from "@/lib/periods/calculate";
import { PeriodRenewalDialog } from "@/components/cards/period-renewal-dialog";
import { PeriodEditDialog } from "@/components/cards/period-edit-dialog";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface CardDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}

export default async function CardDetailPage({
  params,
  searchParams,
}: CardDetailPageProps) {
  const { id } = await params;
  const { offset: offsetStr } = await searchParams;
  const offset = parseInt(offsetStr ?? "0");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!card) notFound();

  const periodExpired = isCurrentPeriodExpired(card);
  const period = getPeriodByOffset(card, offset);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false });

  const periodExpenses = (expenses ?? []).filter((e) =>
    expenseFallsInPeriod(e, period)
  ) as ExpenseWithCategory[];

  const periodTotal = periodExpenses.reduce(
    (sum, e) => sum + getAmountInPeriod(e, period),
    0
  );

  return (
    <div className="relative space-y-5">
      {periodExpired && (
        <PeriodRenewalDialog
          cardId={card.id}
          cardName={card.name}
          oldCloseDate={card.close_date}
          oldDueDate={card.due_date}
        />
      )}

      {/* Halo cálido detrás del header */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 -right-20 h-72"
        style={{
          background: `radial-gradient(ellipse at center, ${card.color}33, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3">
        <Link
          href="/cards"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[13px] text-muted-foreground">{card.name}</p>
          <p className="text-xs text-muted-foreground/80">
            •••• {card.last_four}
          </p>
        </div>
        <Link
          href={`/cards/${id}/edit`}
          aria-label="Editar tarjeta"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      {/* Visual de la tarjeta — centrada */}
      <div className="relative flex justify-center">
        <div className="w-full max-w-[332px]">
          <WalletCard card={card} total={periodTotal} />
        </div>
      </div>

      {/* Period Navigator */}
      <PeriodNavigator card={card} currentPeriod={period} />

      {/* Period progress */}
      <PeriodProgress period={period} color={card.color} now={new Date()} />

      {/* Resumen del período */}
      <div className="flex items-center justify-between rounded-[22px] border border-border bg-card p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Total del período
          </p>
          <Money
            amount={periodTotal}
            className="mt-1 block font-display text-[26px] font-semibold text-foreground"
          />
        </div>
        <PeriodEditDialog
          cardId={card.id}
          currentCloseDate={card.close_date}
          currentDueDate={card.due_date}
        />
      </div>

      {/* Lista de consumos */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Movimientos del período{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({periodExpenses.length})
            </span>
          </h2>
          <Link
            href={`/expenses/new?card_id=${id}`}
            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-white gradient-primary shadow-brand"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Link>
        </div>

        {periodExpenses.length === 0 ? (
          <EmptyState
            icon={<span>🧾</span>}
            title="Sin consumos en este período"
            description="Agregá un consumo para que aparezca acá"
            action={{
              label: "Agregar consumo",
              href: `/expenses/new?card_id=${id}`,
            }}
          />
        ) : (
          <div className="space-y-2">
            {periodExpenses.map((expense) => {
              const instIdx = getInstallmentIndexInPeriod(expense, period);
              const params = new URLSearchParams({ card_id: id });
              if (instIdx >= 0) params.set("installment", String(instIdx));
              return (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  installmentIndex={instIdx}
                  cardId={id}
                  editHref={`/expenses/${expense.id}/edit?${params}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
