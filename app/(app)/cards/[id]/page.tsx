import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Landmark, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/cards/wallet-card";
import { StackHeader } from "@/components/shared/stack-header";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { CardExpenseSearchList } from "@/components/cards/card-expense-search-list";
import { PeriodNavigator } from "@/components/cards/period-navigator";
import { CardDetailSwipe } from "@/components/cards/card-detail-swipe";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPeriodByOffset,
  getPeriodForDate,
  getPeriodTimeline,
  parseLocalDate,
  expenseFallsInPeriod,
  getAmountInPeriodArs,
  getInstallmentIndexInPeriod,
  isCurrentPeriodExpired,
} from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import { PeriodRenewalDialog } from "@/components/cards/period-renewal-dialog";
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

  // Orden de tarjetas (activas del mismo titular) para navegar con swipe entre detalles.
  let cardOrderQuery = supabase
    .from("cards")
    .select("id")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (card.titular_id) cardOrderQuery = cardOrderQuery.eq("titular_id", card.titular_id);
  const { data: cardOrder } = await cardOrderQuery;
  const orderedIds = (cardOrder ?? []).map((c) => c.id);
  const currentIndex = orderedIds.indexOf(id);
  const prevId = currentIndex > 0 ? orderedIds[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < orderedIds.length - 1
      ? orderedIds[currentIndex + 1]
      : null;

  const periodExpired = isCurrentPeriodExpired(card);
  const period = getPeriodByOffset(card, offset);
  // Primer período de la tarjeta = aquel en el que se creó. Sirve para saber
  // si el período navegado tiene un "período anterior" real.
  const firstPeriodKey = getPeriodForDate(
    card,
    parseLocalDate(card.created_at.slice(0, 10))
  ).key;
  const timeline = getPeriodTimeline(card, offset, { firstPeriodKey });

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: periodPayment } = await supabase
    .from("card_period_payments")
    .select("*")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .eq("period_key", period.key)
    .maybeSingle();

  const allExpenses = (expenses ?? []) as ExpenseWithCategory[];

  const periodExpenses = allExpenses.filter((e) =>
    expenseFallsInPeriod(e, period)
  );

  const saldo = periodExpenses.reduce(
    (sum, e) => sum + getAmountInPeriodArs(e, period),
    0
  );

  const limite = card.credit_limit ?? 0;
  const disponible = Math.max(0, limite - saldo);

  // Acciones de movimientos (Fijo / Gastos / Agregar). Se renderizan en la
  // misma fila que "Seleccionar" dentro de la lista.
  const movimientoActions = (
    <>
      <Link
        href={`/expenses/new?card_id=${id}&recurring=1`}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        <Repeat className="h-3.5 w-3.5" />
        Fijo
      </Link>
      <Link
        href={`/expenses/new?card_id=${id}&fee=1`}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        <Landmark className="h-3.5 w-3.5" />
        Gastos
      </Link>
      <Link
        href={`/expenses/new?card_id=${id}`}
        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-white gradient-primary shadow-brand"
      >
        <Plus className="h-3.5 w-3.5" />
        Agregar
      </Link>
    </>
  );

  return (
    <CardDetailSwipe
      prevId={prevId}
      nextId={nextId}
      position={currentIndex >= 0 ? currentIndex + 1 : undefined}
      total={orderedIds.length}
    >
    <div className="space-y-4">
      {periodExpired && (
        <PeriodRenewalDialog
          cardId={card.id}
          cardName={card.name}
          oldCloseDate={card.close_date}
          oldDueDate={card.due_date}
        />
      )}

      {/* Header */}
      <StackHeader
        title="Detalle de tarjeta"
        titleClassName="text-[15px] font-semibold text-foreground"
        backHref="/cards"
        right={
          <CardActionsMenu cardId={id} cardName={card.bank || card.name} periodKey={period.key} />
        }
      />

      {/* Wallet card — los datos siguen al período que se está navegando */}
      <WalletCard
        card={card}
        total={saldo}
        periodLabel={period.status === "current" ? "Período actual" : period.label}
        closeLabel={formatDate(period.end, "d MMM")}
        dueLabel={formatDate(period.due, "d MMM")}
      />

      {/* Period Navigator: estado, navegación, línea de tiempo y límite/disponible */}
      <PeriodNavigator
        card={card}
        cardId={id}
        currentPeriod={period}
        statusText={timeline.statusText}
        closePct={timeline.closePct}
        progressPct={timeline.progressPct}
        lastDueLabel={timeline.lastDue ? formatDate(timeline.lastDue, "dd/MM") : "—"}
        closeLabel={formatDate(timeline.close, "dd/MM")}
        dueLabel={formatDate(timeline.due, "dd/MM")}
        lastDueReached={timeline.lastDueReached}
        closeReached={timeline.closeReached}
        dueReached={timeline.dueReached}
        limite={limite}
        disponible={disponible}
        paid={periodPayment?.paid ?? false}
        paidDate={periodPayment?.paid_date ?? null}
      />

      {/* Lista de movimientos del período. Las acciones (Fijo/Gastos/Agregar)
          van en la misma fila que "Seleccionar", sin título, para ganar
          espacio vertical. */}
      <section className="space-y-3">
        {periodExpenses.length === 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {movimientoActions}
            </div>
            <EmptyState
              icon={<span>🧾</span>}
              title="Sin consumos en este período"
              description="Agregá un consumo para que aparezca acá"
              action={{
                label: "Agregar consumo",
                href: `/expenses/new?card_id=${id}`,
              }}
            />
          </>
        ) : (
          <CardExpenseSearchList
            cardId={id}
            actions={movimientoActions}
            items={periodExpenses.map((expense) => {
              const instIdx = getInstallmentIndexInPeriod(expense, period);
              const p = new URLSearchParams({ card_id: id });
              if (instIdx >= 0) p.set("installment", String(instIdx));
              return {
                expense,
                installmentIndex: instIdx,
                editHref: `/expenses/${expense.id}/edit?${p}`,
              };
            })}
          />
        )}
      </section>
    </div>
    </CardDetailSwipe>
  );
}
