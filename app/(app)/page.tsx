import Link from "next/link";
import { Banknote, Calendar, CalendarClock, ChevronRight, Moon, Receipt, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { DueTodayAlert } from "@/components/home/due-today-alert";
import { EmptyState } from "@/components/shared/empty-state";
import { getNextDuePeriod, getCurrentPeriod, getNextPayment, getAmountInPeriodArs, toArs } from "@/lib/periods/calculate";
import { capitalize, formatDate, nowInArgentina } from "@/lib/utils";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { resolveTitulares } from "@/lib/titulares/server";
import { TitularSwitcher } from "@/components/titulares/titular-switcher";
import { LockScroll } from "@/components/shared/lock-scroll";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Card, Expense, Category, Loan, LoanInstallment } from "@/lib/supabase/database.types";

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
    supabase.from("loan_installments").select("*").eq("user_id", user!.id).order("due_date"),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;
  const loans = (loansResult.data ?? []) as Loan[];
  const allInstallments = (installmentsResult.data ?? []) as LoanInstallment[];
  const pendingInstallments = allInstallments.filter((i) => !i.paid);
  const totalInstallmentsByLoan = new Map<string, number>();
  for (const i of allInstallments) {
    totalInstallmentsByLoan.set(i.loan_id, (totalInstallmentsByLoan.get(i.loan_id) ?? 0) + 1);
  }

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
    const currentTotal = cardExpenses.reduce((s, e) => s + getAmountInPeriodArs(e, currentPeriod), 0);

    return { card, period, total, currentPeriod, currentTotal };
  });

  const cardsSaldoTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

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

  // Préstamos bancarios: próxima cuota pendiente por préstamo, ordenadas
  // por proximidad de vencimiento. Para saber el total de cuotas del préstamo
  // necesitamos contar TODAS las cuotas (pagadas + no pagadas), por eso traemos
  // un conteo aparte abajo.
  const installmentsByLoan = new Map<string, LoanInstallment[]>();
  for (const i of pendingInstallments) {
    const arr = installmentsByLoan.get(i.loan_id) ?? [];
    arr.push(i);
    installmentsByLoan.set(i.loan_id, arr);
  }
  const loansUpcoming = loans
    .map((loan) => {
      const pending = installmentsByLoan.get(loan.id) ?? [];
      const next = pending[0];
      if (!next) return null;
      const totalForLoan = totalInstallmentsByLoan.get(loan.id) ?? next.installment_number;
      const primary = loan.bank || loan.description;
      return {
        id: loan.id,
        accent: loan.color,
        primary,
        suffix: `· Cuota ${next.installment_number}/${totalForLoan}`,
        // Cuotas en USD: convertidas a pesos con el TC efectivo de la cuota.
        amount: toArs(
          { currency: loan.currency, exchange_rate: next.exchange_rate },
          Number(next.amount)
        ),
        days: differenceInCalendarDays(parseLocalDate(next.due_date), todayStart),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days - b.days);

  // "Próximo a vencer" = saldo de tarjetas + próxima cuota de cada préstamo.
  const loansSaldoTotal = loansUpcoming.reduce((s, l) => s + l.amount, 0);
  const saldoTotal = cardsSaldoTotal + loansSaldoTotal;

  const hour = today.getHours();
  const saludo = greeting(hour);
  const isNight = hour < 6 || hour >= 20;

  // Nombre para el saludo: el del titular activo (no el de la cuenta).
  const titularName = activeTitular?.name?.trim() ?? "";
  const displayName = titularName ? capitalize(titularName.split(/\s+/)[0]) : "";

  const weekdayUpper = formatDate(today, "EEEE").toUpperCase();
  const dayNumber = formatDate(today, "d");
  const monthYearUpper = formatDate(today, "MMMM yyyy").toUpperCase();
  const todayKey = format(today, "yyyy-MM-dd");

  return (
    <div className="flex flex-1 flex-col space-y-2.5">
      <LockScroll />
      {/* Saludo + selector de titular en la misma fila (sin sumar alto).
          El icono cambia según sea de día (sol) o de noche (luna). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isNight ? (
            <Moon className="h-[18px] w-[18px] flex-shrink-0 text-indigo-300" />
          ) : (
            <Sun className="h-[18px] w-[18px] flex-shrink-0 text-amber-400" />
          )}
          <p className="truncate font-display text-[18px] font-bold tracking-tight text-foreground">
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
              maxH={200}
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

          {/* Próximo a vencer (mes en curso) → abre el detalle por mes */}
          <Link
            href="/vencimientos"
            aria-label="Ver próximos vencimientos"
            className="glass-card block rounded-[20px] px-5 py-2 transition-transform active:scale-[0.99]"
          >
            <div className="flex w-full items-stretch justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <Money
                  amount={saldoTotal}
                  className="block font-display text-[24px] font-bold leading-none tracking-tight text-foreground"
                />
              </div>

              {/* Caja de fecha tipo calendario */}
              <div className="flex flex-shrink-0 items-center">
                <div className="flex flex-col items-center rounded-[14px] border border-primary/40 px-4 py-2 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {weekdayUpper}
                  </span>
                  <span className="mt-0.5 font-display text-[26px] font-bold leading-none tabular-nums text-foreground">
                    {dayNumber}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {monthYearUpper}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Accesos: vencimientos, cierre y consumos en una sola card,
              ordenados de lo más accionable (lo que vence) a lo informativo. */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Tarjetas y préstamos
            </h2>
            <div className="glass-card space-y-2 rounded-[20px] px-5 py-2">
            <Link
              href="/pagos"
              className="group flex w-full items-center gap-3 text-left transition-colors"
              aria-label="Ver vencimientos de tarjetas de crédito"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Vencimiento de tarjetas
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver vencimientos de tus tarjetas
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </Link>

            <div className="h-px bg-border" />

            <Link
              href={loansUpcoming.length > 0 ? "/prestamos/pagos" : "/prestamos"}
              className="group flex w-full items-center gap-3 text-left transition-colors"
              aria-label="Ver vencimientos de préstamos bancarios"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <Banknote className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Vencimiento de préstamos
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver cuotas de tus préstamos
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </Link>

            <div className="h-px bg-border" />

            <Link
              href="/cierres"
              aria-label="Ver cierres de tarjetas"
              className="group flex w-full items-center gap-3 text-left transition-colors"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Cierre de tarjetas
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver cuándo cierra cada tarjeta
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </Link>

            <div className="h-px bg-border" />

            <Link
              href="/expenses"
              aria-label="Ver todos tus consumos"
              className="group flex w-full items-center gap-3 text-left transition-colors"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#6366f120", color: "#6366f1" }}
              >
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Consumos
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Ver todos tus movimientos
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </Link>
          </div>
          </section>

        </>
      )}
    </div>
  );
}
