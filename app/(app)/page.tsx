import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { ProximosPagosRotator } from "@/components/home/proximos-pagos-rotator";
import { ClosingCardsBillboard } from "@/components/home/closing-cards-billboard";
import { DueTodayAlert } from "@/components/home/due-today-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { getNextDuePeriod, getCurrentPeriod, expenseFallsInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
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

  // Para "Próximos pagos" y "Próximo a pagar": usamos getNextDuePeriod
  // (el período cuyo vencimiento no pasó aún).
  // Para la tarjeta-imagen del carousel: usamos getCurrentPeriod
  // (el período actual según la fecha de cierre), para que coincida con
  // lo que muestra el detalle de tarjeta.
  const cardSummaries = cards.map((card) => {
    const period = getNextDuePeriod(card);
    const currentPeriod = getCurrentPeriod(card);

    const periodExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
    );
    const total = periodExpenses.reduce((s, e) => s + e.installment_amount, 0);

    const currentExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, currentPeriod)
    );
    const currentTotal = currentExpenses.reduce((s, e) => s + e.installment_amount, 0);

    return { card, period, total, currentPeriod, currentTotal };
  });

  const saldoTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

  // Pagos próximos: tarjetas con saldo, ordenadas por fecha de vencimiento.
  // `today` se calcula en zona horaria de Argentina para que el SSR no
  // muestre la fecha del servidor (UTC en Vercel) cuando en Argentina aún es otro día.
  const today = nowInArgentina();
  const todayStart = startOfDay(today);
  const upcoming = cardSummaries
    .filter((c) => c.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime())
    .map(({ card, period, total }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      cardColor: card.color,
      total,
      dueLabel: capitalize(formatDate(period.due, "EEEE d 'de' MMMM")),
      daysUntilDue: differenceInCalendarDays(period.due, todayStart),
    }));

  // Tarjetas que vencen hoy → para alerta pop-up
  const dueToday = cardSummaries
    .filter((c) => differenceInCalendarDays(c.period.due, todayStart) === 0)
    .map(({ card, total }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      total,
    }));

  // Tarjetas que cierran en los próximos 7 días → cartelera rotativa
  const CLOSING_WINDOW_DAYS = 7;
  const closingSoon = cardSummaries
    .map(({ card, currentPeriod }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      cardColor: card.color,
      closeLabel: capitalize(formatDate(currentPeriod.end, "EEEE d 'de' MMM")),
      daysUntilClose: differenceInCalendarDays(currentPeriod.end, todayStart),
    }))
    .filter((c) => c.daysUntilClose >= 0 && c.daysUntilClose <= CLOSING_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilClose - b.daysUntilClose);

  // Mapa id→nombre de tarjeta para el listado de consumos
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.bank || c.name]));
  const recentExpenses = (allExpenses as ExpenseWithCategory[]).slice(0, 15);

  const hour = today.getHours();
  const todayLabel = capitalize(formatDate(today, "EEEE d 'de' MMMM"));
  const todayKey = format(today, "yyyy-MM-dd");

  return (
    <div className="space-y-5">
      {/* Header personalizado */}
      <header className="min-w-0">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-foreground">
          {greeting(hour)} 👋
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{todayLabel}</p>
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
          <DueTodayAlert todayKey={todayKey} cards={dueToday} />

          {/* Card resumen: saldo arriba + cartelera de cierre como pie */}
          <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col items-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Próximo a pagar
              </p>
              <Money
                amount={saldoTotal}
                className="mt-1 block font-display text-[28px] font-bold leading-none text-foreground"
              />
            </div>

            {closingSoon.length > 0 && (
              <>
                <div className="my-4 h-px bg-border" />
                <ClosingCardsBillboard items={closingSoon} />
              </>
            )}
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
                .sort((a, b) => b.currentTotal - a.currentTotal)
                .map(({ card, currentTotal, currentPeriod }) => ({
                  card,
                  total: currentTotal,
                  closeLabel: formatDate(currentPeriod.end, "d MMM"),
                  dueLabel: formatDate(currentPeriod.due, "d MMM"),
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
                  Últimos consumos
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
