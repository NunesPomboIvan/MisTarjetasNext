import Link from "next/link";
import { Bell, ChevronRight, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { HomeCardsCarousel } from "@/components/home/home-cards-carousel";
import { UtilizationDonut } from "@/components/shared/utilization-donut";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentPeriod, expenseFallsInPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { Card, Expense, Category } from "@/lib/supabase/database.types";

export const metadata = { title: "Resumen" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cardsResult, expensesResult] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;

  // Totales por tarjeta (período actual)
  const cardSummaries = cards.map((card) => {
    const period = getCurrentPeriod(card);
    const periodExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
    );
    const total = periodExpenses.reduce((s, e) => s + e.installment_amount, 0);
    return { card, period, total };
  });

  const saldoTotal = cardSummaries.reduce((s, c) => s + c.total, 0);
  const limiteTotal = cards.reduce((s, c) => s + (c.credit_limit ?? 0), 0);
  const disponible = Math.max(0, limiteTotal - saldoTotal);
  const utilizacion = limiteTotal > 0 ? Math.round((saldoTotal / limiteTotal) * 100) : 0;

  // Próximo pago
  const today = new Date();
  const nextDue = cardSummaries
    .filter((c) => c.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime())[0];
  const daysUntilDue = nextDue
    ? Math.ceil((nextDue.period.due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
          Resumen
        </h1>
        <button
          aria-label="Notificaciones"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>
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
          {/* Card resumen con donut */}
          <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-muted-foreground">Saldo total</p>
                <Money
                  amount={saldoTotal}
                  className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
                />
                {limiteTotal > 0 && (
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    Disponible: <Money amount={disponible} className="text-[12px]" />
                  </p>
                )}
              </div>

              {limiteTotal > 0 && (
                <UtilizationDonut percent={utilizacion} size={84} thickness={9} />
              )}
            </div>
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
              items={cardSummaries.map(({ card, total, period }) => ({
                card,
                total,
                closeLabel: formatDate(period.end, "d MMM"),
                dueLabel: formatDate(period.due, "d MMM"),
              }))}
            />
          </section>

          {/* Próximos pagos */}
          {nextDue && (
            <section className="space-y-3">
              <h2 className="font-display text-[16px] font-semibold text-foreground">
                Próximos pagos
              </h2>

              <Link
                href={`/cards/${nextDue.card.id}`}
                className="block rounded-[18px] border border-border bg-card p-4 transition-all active:scale-[0.985] hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(99,102,241,0.12)" }}
                  >
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {nextDue.card.bank ?? nextDue.card.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Pago del período · {formatDate(nextDue.period.due, "d 'de' MMM")}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <Money
                      amount={nextDue.total}
                      className="block text-[15px] font-semibold tabular-nums text-foreground"
                    />
                    <p
                      className={
                        "mt-0.5 text-[11px] font-semibold " +
                        (daysUntilDue <= 3 ? "text-destructive" : "text-muted-foreground")
                      }
                    >
                      {daysUntilDue <= 0
                        ? "Vence hoy"
                        : `Vence en ${daysUntilDue} día${daysUntilDue === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/pagos"
                className="flex items-center justify-between rounded-[14px] px-1 py-1 text-[13px] font-semibold text-primary"
              >
                Ver todos los pagos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
