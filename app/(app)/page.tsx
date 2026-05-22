import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { CardsBillboard } from "@/components/home/cards-billboard";
import { DueTodayAlert } from "@/components/home/due-today-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { getNextDuePeriod, getCurrentPeriod, getNextPayment, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { getActiveTitularId } from "@/lib/titulares/server";
import type { Card, Expense, Category } from "@/lib/supabase/database.types";

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
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const [cardsResult, expensesResult] = await Promise.all([
    cardsQuery,
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
    const cardExpenses = allExpenses.filter((e) => e.card_id === card.id);

    // Próximo pago: período más cercano a vencer CON saldo (salta los vacíos).
    const payment = getNextPayment(card, cardExpenses);
    const period = payment?.period ?? getNextDuePeriod(card);
    const total = payment?.total ?? 0;

    // Período actual (según cierre) para la tarjeta-imagen del carousel.
    const currentPeriod = getCurrentPeriod(card);
    const currentTotal = cardExpenses.reduce((s, e) => s + getAmountInPeriod(e, currentPeriod), 0);

    return { card, period, total, currentPeriod, currentTotal };
  });

  const saldoTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

  // Pagos próximos: tarjetas con saldo, ordenadas por fecha de vencimiento.
  // `today` se calcula en zona horaria de Argentina para que el SSR no
  // muestre la fecha del servidor (UTC en Vercel) cuando en Argentina aún es otro día.
  const today = nowInArgentina();
  const todayStart = startOfDay(today);
  // Próximos pagos: tarjetas CON consumos en su período actual, según el
  // vencimiento de ese período, ordenadas por proximidad de vencimiento.
  const upcoming = cardSummaries
    .filter((c) => c.currentTotal > 0)
    .sort((a, b) => a.currentPeriod.due.getTime() - b.currentPeriod.due.getTime())
    .map(({ card, currentPeriod }) => ({
      id: card.id,
      accent: card.color,
      primary: card.bank || card.name,
      suffix: card.last_four,
      days: differenceInCalendarDays(currentPeriod.due, todayStart),
    }));

  // Tarjetas que vencen hoy → para alerta pop-up
  const dueToday = cardSummaries
    .filter((c) => c.total > 0 && differenceInCalendarDays(c.period.due, todayStart) === 0)
    .map(({ card, total }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      total,
    }));

  // Cierre de tarjetas: tarjetas CON consumos en su período actual, ordenadas
  // por proximidad de cierre.
  const closingSoon = cardSummaries
    .filter((c) => c.currentTotal > 0)
    .map(({ card, currentPeriod }) => ({
      id: card.id,
      accent: card.color,
      primary: card.bank || card.name,
      suffix: card.last_four,
      days: differenceInCalendarDays(currentPeriod.end, todayStart),
    }))
    .sort((a, b) => a.days - b.days);

  const hour = today.getHours();
  const weekdayLabel = capitalize(formatDate(today, "EEEE"));
  const dayMonthLabel = formatDate(today, "dd/MM/yyyy");
  const todayKey = format(today, "yyyy-MM-dd");

  return (
    <div className="space-y-5">
      {/* Header personalizado */}
      <header className="min-w-0">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-foreground">
          {greeting(hour)} 👋
        </h1>
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

          {/* Card resumen: saldo + fecha de hoy */}
          <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Próximo a pagar
                </p>
                <Money
                  amount={saldoTotal}
                  className="mt-1 block font-display text-[28px] font-bold leading-none text-foreground"
                />
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {weekdayLabel}
                </p>
                <p className="mt-1 text-[15px] font-bold leading-none text-foreground tabular-nums">
                  {dayMonthLabel}
                </p>
              </div>
            </div>
          </section>

          {/* Mis tarjetas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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

          {/* Próximos pagos + Cierre de tarjetas */}
          {(upcoming.length > 0 || closingSoon.length > 0) && (
            <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
              {upcoming.length > 0 && (
                <CardsBillboard
                  items={upcoming}
                  label="Próximos pagos"
                  href="/pagos"
                  icon="calendar"
                  ariaLabel="Ver próximos pagos de todas las tarjetas"
                />
              )}

              {upcoming.length > 0 && closingSoon.length > 0 && (
                <div className="my-4 h-px bg-border" />
              )}

              {closingSoon.length > 0 && (
                <CardsBillboard
                  items={closingSoon}
                  label="Cierre de tarjetas"
                  href="/cierres"
                  icon="calendar-clock"
                  ariaLabel="Ver próximos cierres de todas las tarjetas"
                />
              )}
            </section>
          )}

        </>
      )}
    </div>
  );
}
