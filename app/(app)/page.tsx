import Link from "next/link";
import { Banknote, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { CardsBillboard } from "@/components/home/cards-billboard";
import { DueTodayAlert } from "@/components/home/due-today-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { getNextDuePeriod, getCurrentPeriod, getNextPayment, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { resolveTitulares } from "@/lib/titulares/server";
import { TitularSwitcher } from "@/components/titulares/titular-switcher";
import { ScrollLock } from "@/components/shared/scroll-lock";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Card, Expense, Category, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Inicio" };

function greeting(hour: number): string {
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function greetingEmoji(hour: number): string {
  if (hour < 6) return "🌙";
  if (hour < 13) return "🌞";
  if (hour < 20) return "☀️";
  return "🌙";
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

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false);
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [cardsResult, expensesResult, loansResult, installmentsResult] = await Promise.all([
    cardsQuery,
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
    loansQuery,
    supabase.from("loan_installments").select("*").eq("user_id", user!.id).eq("paid", false).order("due_date"),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;
  const loans = (loansResult.data ?? []) as Loan[];
  const pendingInstallments = (installmentsResult.data ?? []) as LoanInstallment[];

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

  // Préstamos bancarios: próxima cuota pendiente por préstamo, ordenadas
  // por proximidad de vencimiento.
  const loansUpcoming = loans
    .map((loan) => {
      const next = pendingInstallments.find((i) => i.loan_id === loan.id);
      if (!next) return null;
      return {
        id: loan.id,
        accent: loan.color,
        primary: loan.bank || loan.description,
        suffix: undefined as string | undefined,
        days: differenceInCalendarDays(parseLocalDate(next.due_date), todayStart),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days - b.days);

  const hour = today.getHours();
  const weekdayLabel = capitalize(formatDate(today, "EEEE"));
  const dayMonthLabel = formatDate(today, "dd/MM/yyyy");
  const todayKey = format(today, "yyyy-MM-dd");

  return (
    <div className="space-y-3">
      <ScrollLock />
      {/* Header personalizado */}
      <header className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-[26px] tracking-tight text-muted-foreground">
          {greeting(hour)}
          {activeTitular ? (
            <>
              ,{" "}
              <span className="font-bold text-foreground">{activeTitular.name}</span>
            </>
          ) : null}
          <span
            className="ml-1.5 inline-block"
            style={greetingEmoji(hour) === "🌙" ? { transform: "scaleX(-1)" } : undefined}
          >
            {greetingEmoji(hour)}
          </span>
        </h1>
        {titulares.length > 0 && (
          <TitularSwitcher titulares={titulares} activeId={activeTitularId} />
        )}
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

          {/* Mis tarjetas */}
          <section className="space-y-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground">
              Mis tarjetas
            </h2>

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

          {/* Card resumen: saldo + fecha de hoy */}
          <section
            className="rounded-[20px] border border-white/[0.10] bg-card/85 px-5 py-[18px] backdrop-blur-xl"
            style={{
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow:
                "0 0 32px -6px rgba(129,140,248,0.28), 0 14px 40px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Money
                  amount={saldoTotal}
                  className="block font-display text-[20px] font-bold leading-none text-foreground"
                />
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {weekdayLabel}
                </p>
                <p className="mt-1 text-[17px] font-bold leading-none tabular-nums text-foreground">
                  {dayMonthLabel}
                </p>
              </div>
            </div>
          </section>

          {/* Próximos Vencimientos: Tarjeta de crédito + Préstamos bancarios */}
          <section className="space-y-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-foreground">
              Próximos Vencimientos
            </h2>
            <div
              className="rounded-[20px] border border-white/[0.08] bg-card/85 px-5 py-4 backdrop-blur-xl"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow:
                  "0 0 28px -6px rgba(129,140,248,0.20), 0 14px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {upcoming.length > 0 && (
                <CardsBillboard
                  items={upcoming}
                  label="Tarjeta de crédito"
                  href="/pagos"
                  icon="calendar"
                  ariaLabel="Ver próximos pagos de todas las tarjetas"
                />
              )}

              {upcoming.length > 0 && <div className="my-4 h-px bg-border" />}

              {loansUpcoming.length > 0 ? (
                <CardsBillboard
                  items={loansUpcoming}
                  label="Préstamos bancarios"
                  href="/prestamos"
                  icon="banknote"
                  ariaLabel="Ver próximas cuotas de préstamos bancarios"
                />
              ) : (
                <Link
                  href="/prestamos"
                  className="group flex w-full items-center gap-3 text-left transition-colors"
                  aria-label="Gestionar préstamos bancarios"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#6366f120", color: "#6366f1" }}
                  >
                    <Banknote className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Préstamos bancarios
                    </p>
                    <p className="text-[11.5px] font-medium leading-tight text-muted-foreground">
                      Gestioná tus préstamos desde acá
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
                </Link>
              )}
            </div>
          </section>

        </>
      )}
    </div>
  );
}
