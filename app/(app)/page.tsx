import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { ProximosPagosRotator } from "@/components/home/proximos-pagos-rotator";
import { LocalUserName } from "@/components/shared/local-user";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { getNextDuePeriod, expenseFallsInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize } from "@/lib/utils";
import type { Card, Expense, Category, ExpenseWithCategory } from "@/lib/supabase/database.types";

export const metadata = { title: "Inicio" };

function greeting(hour: number): string {
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cardsResult, expensesResult] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;

  // Totales por tarjeta: tomamos el período cuyo vencimiento es el inmediato
  // siguiente a hoy (el saldo que toca pagar próximamente).
  const cardSummaries = cards.map((card) => {
    const period = getNextDuePeriod(card);
    const periodExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
    );
    const total = periodExpenses.reduce((s, e) => s + e.installment_amount, 0);
    return { card, period, total };
  });

  const saldoTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

  // Pagos próximos: tarjetas con saldo, ordenadas por fecha de vencimiento
  const today = new Date();
  const upcoming = cardSummaries
    .filter((c) => c.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime())
    .map(({ card, period, total }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      cardColor: card.color,
      total,
      dueLabel: capitalize(formatDate(period.due, "EEEE d 'de' MMMM")),
      daysUntilDue: Math.ceil(
        (period.due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

  // Mapa id→nombre de tarjeta para el listado de consumos
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.bank || c.name]));
  const recentExpenses = (allExpenses as ExpenseWithCategory[]).slice(0, 15);

  // Nombre para el saludo
  const rawName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    (user?.email?.split("@")[0] ?? "");
  const firstName = rawName.split(/[\s._-]/)[0] ?? "";
  const displayName = firstName ? capitalize(firstName) : "";

  const hour = today.getHours();
  const todayLabel = capitalize(formatDate(today, "EEEE d 'de' MMMM"));

  return (
    <div className="space-y-5">
      {/* Header personalizado */}
      <header className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {greeting(hour)}
        </p>
        <h1 className="mt-0.5 truncate font-display text-[24px] font-bold tracking-tight text-foreground">
          Hola, <LocalUserName fallback={displayName || "Usuario"} /> 👋
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{todayLabel}</p>
      </header>

      {cards.length === 0 ? (
        <EmptyState
          icon={<span>💳</span>}
          title="Bienvenido"
          description="Agregá tu primera tarjeta para empezar"
          action={{ label: "Agregar tarjeta", href: "/cards/new" }}
        />
      ) : (
        <>
          {/* Card resumen */}
          <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
            <p className="text-[12px] font-medium text-muted-foreground">Saldo total</p>
            <Money
              amount={saldoTotal}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
            />
          </section>

          {/* Mis tarjetas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-foreground">
                Mis tarjetas
              </h2>
              <Link href="/cards" className="text-[13px] font-semibold text-primary">
                Ver todas
              </Link>
            </div>

            <HomeCardsCarousel
              items={[...cardSummaries]
                .sort((a, b) => b.total - a.total)
                .map(({ card, total, period }) => ({
                  card,
                  total,
                  closeLabel: formatDate(period.end, "d MMM"),
                  dueLabel: formatDate(period.due, "d MMM"),
                }))}
            />
          </section>

          {/* Próximos pagos — rotador */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[16px] font-semibold text-foreground">
                  Próximos pagos
                </h2>
                <Link href="/pagos" className="text-[13px] font-semibold text-primary">
                  Ver todos
                </Link>
              </div>

              <ProximosPagosRotator items={upcoming} />
            </section>
          )}

          {/* Últimos consumos */}
          {recentExpenses.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[16px] font-semibold text-foreground">
                  Últimos gastos
                </h2>
                <Link href="/expenses" className="text-[13px] font-semibold text-primary">
                  Ver todos
                </Link>
              </div>

              <div className="space-y-2">
                {recentExpenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    cardName={cardMap[expense.card_id]}
                    editHref={`/expenses/${expense.id}/edit`}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
