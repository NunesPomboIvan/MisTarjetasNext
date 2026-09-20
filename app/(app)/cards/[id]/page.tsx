import { notFound } from "next/navigation";
import Link from "next/link";
import { Landmark, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { CardExpenseSearchList } from "@/components/cards/card-expense-search-list";
import { CardHero } from "@/components/cards/card-hero";
import { CardBalanceDialog } from "@/components/cards/card-balance-dialog";
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

  // Acciones de movimientos, en la misma fila que el botón de "Seleccionar"
  // (que acá se muestra solo con el ícono, sin la palabra —
  // compactSelectToggle más abajo). "Nuevo consumo" va pegado a
  // "Seleccionar" (a la izquierda); Saldo / Gastos / menú van agrupados
  // contra el margen derecho con `ml-auto`. "Pendiente de pago" vive en
  // CardHero, debajo del logo de la red.
  const movimientoActions = (
    <>
      <Link
        href={`/expenses/new?card_id=${id}`}
        className="-ml-2 inline-flex h-8 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[11px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0" />
        Nuevo consumo
      </Link>
      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <CardBalanceDialog saldo={saldo} limite={limite} disponible={disponible} />
        <Link
          href={`/expenses/new?card_id=${id}&fee=1`}
          className="inline-flex h-8 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[11px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
        >
          <Landmark className="h-3.5 w-3.5 flex-shrink-0" />
          Gastos
        </Link>
        <CardActionsMenu cardId={id} cardName={card.bank || card.name} periodKey={period.key} />
      </div>
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

      {/* Card unificada: tarjeta física + saldo + navegación + línea de
          tiempo, todo con el color de la tarjeta. Límite/disponible viven
          en el popup del botón "Saldo" (CardBalanceDialog), no acá. */}
      <CardHero
        card={card}
        cardId={id}
        currentPeriod={period}
        saldo={saldo}
        paid={periodPayment?.paid ?? false}
        paidDate={periodPayment?.paid_date ?? null}
        statusText={timeline.statusText}
        closePct={timeline.closePct}
        progressPct={timeline.progressPct}
        lastDueLabel={timeline.lastDue ? formatDate(timeline.lastDue, "dd/MM") : "—"}
        closeLabel={formatDate(timeline.close, "dd/MM")}
        dueLabel={formatDate(timeline.due, "dd/MM")}
        lastDueReached={timeline.lastDueReached}
        closeReached={timeline.closeReached}
        dueReached={timeline.dueReached}
        highlightKey={timeline.highlightKey}
      />

      {/* Lista de movimientos del período. Las acciones (Pendiente de
          pago/Saldo/menú/Agregar) van en la misma fila que "Seleccionar",
          sin header ni título, para ganar espacio vertical. */}
      <section className="space-y-3">
        {periodExpenses.length === 0 ? (
          <>
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
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
            compactSelectToggle
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
