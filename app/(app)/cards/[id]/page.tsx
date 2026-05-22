import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WalletCard } from "@/components/cards/wallet-card";
import { Money } from "@/components/shared/money";
import { UtilizationDonut } from "@/components/shared/utilization-donut";
import { BackButton } from "@/components/shared/back-button";
import { CardActionsMenu } from "@/components/cards/card-actions-menu";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { PeriodNavigator } from "@/components/cards/period-navigator";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPeriodByOffset,
  expenseFallsInPeriod,
  getAmountInPeriod,
  getInstallmentIndexInPeriod,
  isCurrentPeriodExpired,
} from "@/lib/periods/calculate";
import { formatDate, capitalize } from "@/lib/utils";
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

  const periodExpired = isCurrentPeriodExpired(card);
  const period = getPeriodByOffset(card, offset);
  const currentPeriod = getPeriodByOffset(card, 0);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false });

  const allExpenses = (expenses ?? []) as ExpenseWithCategory[];

  const periodExpenses = allExpenses.filter((e) =>
    expenseFallsInPeriod(e, period)
  );

  const saldo = periodExpenses.reduce(
    (sum, e) => sum + getAmountInPeriod(e, period),
    0
  );

  // La imagen de la tarjeta siempre muestra el período actual,
  // sin importar qué período se esté navegando abajo.
  const currentSaldo = allExpenses
    .filter((e) => expenseFallsInPeriod(e, currentPeriod))
    .reduce((sum, e) => sum + getAmountInPeriod(e, currentPeriod), 0);
  const limite = card.credit_limit ?? 0;
  const disponible = Math.max(0, limite - saldo);
  const utilizacion = limite > 0 ? Math.round((saldo / limite) * 100) : 0;

  return (
    <div className="space-y-5">
      {periodExpired && (
        <PeriodRenewalDialog
          cardId={card.id}
          cardName={card.name}
          oldCloseDate={card.close_date}
          oldDueDate={card.due_date}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Detalle de tarjeta</h1>
        <CardActionsMenu cardId={id} cardName={card.bank || card.name} />
      </div>

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

      {/* Stats card: Límite + Saldo side by side, donut a la derecha */}
      <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Límite + Saldo lado a lado */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Límite total</p>
              {limite > 0 ? (
                <Money
                  amount={limite}
                  className="mt-0.5 block font-display text-[18px] font-bold leading-tight tracking-tight text-foreground truncate"
                />
              ) : (
                <Link
                  href={`/cards/${id}/edit`}
                  className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Definir límite
                </Link>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Saldo actual</p>
              <Money
                amount={saldo}
                className="mt-0.5 block font-display text-[18px] font-bold leading-tight text-foreground truncate"
              />
            </div>
          </div>

          {limite > 0 && (
            <UtilizationDonut
              percent={utilizacion}
              size={84}
              thickness={9}
              label="Utilizado"
            />
          )}
        </div>
      </section>

      {/* Stats 3 columnas */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[14px] border border-border bg-card p-3">
          <p className="text-[10.5px] font-medium text-muted-foreground">Disponible</p>
          <Money
            amount={disponible}
            className="mt-1 block text-[14px] font-bold leading-none tabular-nums"
            style={{ color: "#10b981" }}
          />
        </div>
        <div className="rounded-[14px] border border-border bg-card p-3">
          <p className="text-[10.5px] font-medium text-muted-foreground">Cierre</p>
          <p className="mt-1 text-[14px] font-bold leading-none text-foreground tabular-nums">
            {capitalize(formatDate(period.end, "d 'de' MMM"))}
          </p>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-3">
          <p className="text-[10.5px] font-medium text-muted-foreground">Vencimiento</p>
          <p className="mt-1 text-[14px] font-bold leading-none text-foreground tabular-nums">
            {capitalize(formatDate(period.due, "d 'de' MMM"))}
          </p>
        </div>
      </section>

      {/* Lista de movimientos del período */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[16px] font-semibold text-foreground">
            Movimientos{" "}
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
              const p = new URLSearchParams({ card_id: id });
              if (instIdx >= 0) p.set("installment", String(instIdx));
              return (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  installmentIndex={instIdx}
                  cardId={id}
                  editHref={`/expenses/${expense.id}/edit?${p}`}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
