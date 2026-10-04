import { Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { DueTodayAlert } from "@/components/home/due-today-alert";
import { RecentExpenses, type RecentExpense } from "@/components/home/recent-expenses";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getNextDuePeriod,
  getNextPayment,
  getAmountInPeriodArs,
  getPeriodByOffset,
  getPeriodForDate,
  getPeriodTimeline,
  parseLocalDate,
} from "@/lib/periods/calculate";
import { capitalize, formatDate, nowInArgentina } from "@/lib/utils";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { resolveTitulares } from "@/lib/titulares/server";
import { TitularSwitcher } from "@/components/titulares/titular-switcher";
import { LockScroll } from "@/components/shared/lock-scroll";
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
  const { titulares, activeId: activeTitularId, active: activeTitular } = await resolveTitulares();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  // Últimos consumos: por fecha de carga (created_at), acotados al titular
  // activo vía el join con la tarjeta.
  let recentQuery = supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards!inner(name, bank, last_four, type, titular_id)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    // La home muestra los que entren en pantalla (RecentExpenses mide).
    .limit(12);
  if (activeTitularId) recentQuery = recentQuery.eq("card.titular_id", activeTitularId);

  const [cardsResult, expensesResult, recentResult] = await Promise.all([
    cardsQuery,
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
    recentQuery,
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;
  const recentExpenses = (recentResult.data ?? []) as unknown as RecentExpense[];

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
    // Mismo período y línea de tiempo que el detalle de la tarjeta (offset 0).
    const currentPeriod = getPeriodByOffset(card, 0);
    const firstPeriodKey = getPeriodForDate(card, parseLocalDate(card.created_at.slice(0, 10))).key;
    const timeline = getPeriodTimeline(card, 0, { firstPeriodKey });
    const currentTotal = cardExpenses.reduce((s, e) => s + getAmountInPeriodArs(e, currentPeriod), 0);

    // Último uso: fecha del consumo más reciente (allExpenses viene ordenado
    // por expense_date desc, así que el primero es el último usado). Si no tiene
    // consumos, usamos la fecha de creación para que ordene al final.
    const lastUsed = cardExpenses[0]?.expense_date ?? card.created_at.slice(0, 10);

    return { card, period, total, currentPeriod, currentTotal, timeline, lastUsed };
  });

  // Pagos próximos: tarjetas con saldo, ordenadas por fecha de vencimiento.
  // `today` se calcula en zona horaria de Argentina para que el SSR no
  // muestre la fecha del servidor (UTC en Vercel) cuando en Argentina aún es otro día.
  const today = nowInArgentina();
  const todayStart = startOfDay(today);

  // Tarjetas que vencen hoy → para alerta pop-up
  const dueToday = cardSummaries
    .filter((c) => c.total > 0 && differenceInCalendarDays(c.period.due, todayStart) === 0)
    .map(({ card, total }) => ({
      cardId: card.id,
      cardName: card.bank || card.name,
      total,
    }));

  const hour = today.getHours();
  const saludo = greeting(hour);
  const isNight = hour < 6 || hour >= 20;

  // Nombre para el saludo: el del titular activo (no el de la cuenta).
  const titularName = activeTitular?.name?.trim() ?? "";
  const displayName = titularName ? capitalize(titularName.split(/\s+/)[0]) : "";

  const todayKey = format(today, "yyyy-MM-dd");

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <LockScroll />
      {/* Saludo + selector de titular en la misma fila, altura acotada.
          El icono cambia según sea de día (sol) o de noche (luna). */}
      <div className="flex min-h-[40px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isNight ? (
            <Moon className="h-4 w-4 flex-shrink-0 text-[#8DB3E6]" />
          ) : (
            <Sun className="h-4 w-4 flex-shrink-0 text-amber-400" />
          )}
          <p className="truncate font-display text-[15px] font-bold tracking-tight text-foreground">
            {saludo}
            {displayName ? `, ${displayName}` : ""}
          </p>
        </div>
        {titulares.length > 0 && (
          <TitularSwitcher titulares={titulares} activeId={activeTitularId} />
        )}
      </div>

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

          {/* Mis tarjetas */}
          <section className="space-y-2">
            <HomeCardsCarousel
              items={[...cardSummaries]
                .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
                .map(({ card, currentTotal, currentPeriod, timeline }) => ({
                  card,
                  total: currentTotal,
                  period: currentPeriod,
                  timeline: {
                    statusText: timeline.statusText,
                    closePct: timeline.closePct,
                    progressPct: timeline.progressPct,
                    lastDueLabel: timeline.lastDue ? formatDate(timeline.lastDue, "dd/MM") : "—",
                    closeLabel: formatDate(timeline.close, "dd/MM"),
                    dueLabel: formatDate(timeline.due, "dd/MM"),
                    lastDueReached: timeline.lastDueReached,
                    closeReached: timeline.closeReached,
                    dueReached: timeline.dueReached,
                    highlightKey: timeline.highlightKey,
                  },
                }))}
            />
          </section>

          <RecentExpenses expenses={recentExpenses} />
        </>
      )}
    </div>
  );
}
