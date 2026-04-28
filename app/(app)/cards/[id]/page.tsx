import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PeriodNavigator } from "@/components/cards/period-navigator";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { CardLogo } from "@/components/cards/card-logo";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPeriodByOffset,
  expenseFallsInPeriod,
  getInstallmentIndexInPeriod,
} from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface CardDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}

export default async function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
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

  const periodTotal = periodExpenses.reduce((sum, e) => sum + e.installment_amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cards"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: card.color + "20" }}
          >
            <CardLogo type={card.type} size="sm" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{card.name}</h1>
            <p className="text-xs text-muted-foreground">•••• {card.last_four}</p>
          </div>
        </div>
        <Link
          href={`/cards/${id}/edit`}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      {/* Period Navigator */}
      <PeriodNavigator card={card} currentPeriod={period} />

      {/* Resumen del período */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total del período</p>
        <Money amount={periodTotal} gradient className="mt-1 block text-2xl" />
        <p className="mt-1 text-xs text-muted-foreground">
          Vence {formatDate(period.due, "d 'de' MMMM")}
        </p>
      </div>

      {/* Lista de consumos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Consumos{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({periodExpenses.length})
            </span>
          </h2>
          <Link
            href={`/expenses/new?card_id=${id}`}
            className="inline-flex h-8 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white gradient-primary shadow-brand"
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
            action={{ label: "Agregar consumo", href: `/expenses/new?card_id=${id}` }}
          />
        ) : (
          <div className="space-y-2">
            {periodExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                installmentIndex={getInstallmentIndexInPeriod(expense, period)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
