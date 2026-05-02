import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { CardLogo } from "@/components/cards/card-logo";
import { EmptyState } from "@/components/shared/empty-state";
import { CardQuickAdd } from "@/components/shared/card-quick-add";
import { getCurrentPeriod, expenseFallsInPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { Card, Expense, Category } from "@/lib/supabase/database.types";

export const metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cardsResult, expensesResult] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;

  // Categorías para el QuickExpenseSheet anidado en cada quick-add
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user!.id},user_id.is.null`)
    .order("is_preset", { ascending: false })
    .order("name");
  const categories = (categoriesData ?? []) as Category[];

  // Calcular totales por tarjeta
  const cardSummaries = cards.map((card) => {
    const period = getCurrentPeriod(card);
    const periodExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
    );
    const total = periodExpenses.reduce((s, e) => s + e.installment_amount, 0);
    return { card, period, total };
  });

  const grandTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

  // Próximo vencimiento — todas las tarjetas que comparten la fecha más próxima
  const cardsSortedByDue = cardSummaries
    .filter((c) => c.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());
  const soonestDueTime = cardsSortedByDue[0]?.period.due.getTime();
  const nextDueGroup = soonestDueTime
    ? cardsSortedByDue.filter((c) => c.period.due.getTime() === soonestDueTime)
    : [];

  // Top 3 categorías del mes
  const catTotals: Record<string, { name: string; emoji: string; colorBg: string; colorText: string; total: number }> = {};
  for (const exp of allExpenses) {
    if (!exp.category) continue;
    const period = getCurrentPeriod(
      cards.find((c) => c.id === exp.card_id) ?? { close_date: "2026-01-01", due_date: "2026-01-01" }
    );
    if (!expenseFallsInPeriod(exp, period)) continue;
    const cid = exp.category_id!;
    if (!catTotals[cid]) {
      catTotals[cid] = {
        name: exp.category.name,
        emoji: exp.category.emoji,
        colorBg: exp.category.color_bg,
        colorText: exp.category.color_text,
        total: 0,
      };
    }
    catTotals[cid].total += exp.installment_amount;
  }
  const topCategories = Object.values(catTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Header saludo */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Mis Tarjetas</h1>
        <p className="text-sm text-muted-foreground">Resumen del mes actual</p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<span>💳</span>}
          title="Bienvenido a Mis Tarjetas"
          description="Agregá tu primera tarjeta para empezar"
          action={{ label: "Agregar tarjeta", href: "/cards/new" }}
        />
      ) : (
        <>
          {/* Total global */}
          <div className="rounded-2xl p-5 gradient-primary shadow-brand text-white">
            <p className="text-sm font-medium opacity-80">Total a pagar este mes</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">
              {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(grandTotal)}
            </p>
            {nextDueGroup.length > 0 && (
              <div className="mt-3 text-right">
                <p className="text-xs opacity-70">Próximo vencimiento</p>
                <p className="text-sm font-semibold">
                  {nextDueGroup.map((c) => c.card.name).join(" · ")}{" "}
                  · {formatDate(nextDueGroup[0].period.due, "d/M")}
                </p>
              </div>
            )}
          </div>

          {/* Tarjetas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Tarjetas</h2>
              <Link href="/cards" className="text-sm text-primary">
                Ver todas
              </Link>
            </div>
            {cardSummaries.map(({ card, period, total }) => (
              <div
                key={card.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-all"
              >
                <Link
                  href={`/cards/${card.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: card.color + "20" }}
                  >
                    <CardLogo type={card.type} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      vence {formatDate(period.due, "d 'de' MMMM")}
                    </p>
                  </div>
                  <Money amount={total} gradient={total > 0} size="md" />
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Link>
                <CardQuickAdd
                  cardId={card.id}
                  cards={cards}
                  categories={categories}
                />
              </div>
            ))}
          </div>

          {/* Top categorías */}
          {topCategories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Top categorías este mes</h2>
              </div>
              <div className="space-y-2">
                {topCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: cat.colorBg }}
                    >
                      {cat.emoji}
                    </span>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Money amount={cat.total} size="md" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
