import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Landmark, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/cards/wallet-card";
import { Money } from "@/components/shared/money";
import { UtilizationDonut } from "@/components/shared/utilization-donut";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { CardExpenseSearchList } from "@/components/cards/card-expense-search-list";
import { PeriodNavigator } from "@/components/cards/period-navigator";
import { CardDetailSwipe } from "@/components/cards/card-detail-swipe";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPeriodByOffset,
  expenseFallsInPeriod,
  getAmountInPeriodArs,
  getInstallmentIndexInPeriod,
  isCurrentPeriodExpired,
} from "@/lib/periods/calculate";
import { formatDate, formatLongDate } from "@/lib/utils";
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
  const currentPeriod = getPeriodByOffset(card, 0);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const allExpenses = (expenses ?? []) as ExpenseWithCategory[];

  const periodExpenses = allExpenses.filter((e) =>
    expenseFallsInPeriod(e, period)
  );

  const saldo = periodExpenses.reduce(
    (sum, e) => sum + getAmountInPeriodArs(e, period),
    0
  );

  // La imagen de la tarjeta siempre muestra el período actual,
  // sin importar qué período se esté navegando abajo.
  const currentSaldo = allExpenses
    .filter((e) => expenseFallsInPeriod(e, currentPeriod))
    .reduce((sum, e) => sum + getAmountInPeriodArs(e, currentPeriod), 0);
  const limite = card.credit_limit ?? 0;
  const disponible = Math.max(0, limite - saldo);
  const utilizacion = limite > 0 ? Math.round((saldo / limite) * 100) : 0;

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
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[15px] font-semibold text-foreground">Detalle de tarjeta</h1>
          <CardActionsMenu cardId={id} cardName={card.bank || card.name} />
        </div>
      </StickyPageHeader>

      {/* Wallet card */}
      <WalletCard
        card={card}
        total={currentSaldo}
        closeLabel={formatDate(currentPeriod.end, "d MMM")}
        dueLabel={formatDate(currentPeriod.due, "d MMM")}
      />

      {/* Period Navigator */}
      <PeriodNavigator
        card={card}
        currentPeriod={period}
        startLabel={formatDate(period.start, "d MMM")}
        endLabel={formatDate(period.end, "d MMM")}
        dueLabel={formatDate(period.due, "d/M")}
      />

      {/* Stats card: saldo + anillo arriba; límite/disponible y cierre/vencimiento
          en dos columnas para reducir la altura de la card. */}
      <section className="rounded-[18px] border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-medium text-muted-foreground">Saldo actual</p>
            <Money
              amount={saldo}
              className="mt-0.5 block font-display text-[19px] font-bold leading-tight tracking-tight text-foreground tabular-nums"
            />
          </div>

          {limite > 0 && (
            <UtilizationDonut
              percent={utilizacion}
              size={62}
              thickness={7}
              label="Utilizado"
            />
          )}
        </div>

        <div className="my-2.5 h-px bg-border" />

        <div className="space-y-2">
          {/* Límite total + Disponible, lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">Límite total</p>
              {limite > 0 ? (
                <Money
                  amount={limite}
                  className="mt-0.5 block font-display text-[14px] font-bold leading-tight tracking-tight text-foreground tabular-nums"
                />
              ) : (
                <Link
                  href={`/cards/${id}/edit`}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Definir límite
                </Link>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">Disponible</p>
              <Money
                amount={disponible}
                className="mt-0.5 block font-display text-[14px] font-bold leading-tight tracking-tight tabular-nums"
                style={{ color: "#30D158" }}
              />
            </div>
          </div>

          {/* Cierre + Vencimiento, lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">Cierre</p>
              <p className="mt-0.5 text-[13px] font-bold leading-tight text-foreground tabular-nums">
                {formatLongDate(period.end)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">Vencimiento</p>
              <p className="mt-0.5 text-[13px] font-bold leading-tight text-foreground tabular-nums">
                {formatLongDate(period.due)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de movimientos del período */}
      <section className="space-y-3">
        {/* Acciones arriba, separadas del título para dar aire respecto del
            resumen superior. */}
        <div className="flex items-center justify-end gap-2">
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
        </div>

        {/* Título, ligeramente más bajo para separarlo del bloque de acciones. */}
        <h2 className="pt-1 font-display text-[16px] font-semibold text-foreground">
          Movimientos
        </h2>

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
          <CardExpenseSearchList
            cardId={id}
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
