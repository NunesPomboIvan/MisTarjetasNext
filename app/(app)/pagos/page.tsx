import Link from "next/link";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { getNextDuePeriod, expenseFallsInPeriod, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Card, Expense } from "@/lib/supabase/database.types";

export const metadata = { title: "Próximos pagos" };

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: cards }, { data: expenses }] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*").eq("user_id", user!.id),
  ]);

  const allCards = (cards ?? []) as Card[];
  const allExpenses = (expenses ?? []) as Expense[];

  const todayStart = startOfDay(nowInArgentina());

  const upcoming = allCards
    .map((card) => {
      const period = getNextDuePeriod(card);
      const cardExpenses = allExpenses.filter(
        (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
      );
      const total = cardExpenses.reduce((s, e) => s + getAmountInPeriod(e, period), 0);
      const daysUntil = differenceInCalendarDays(period.due, todayStart);
      return { card, period, total, daysUntil };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());

  const totalPagos = upcoming.reduce((s, u) => s + u.total, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-center">
        <h1 className="font-display text-[20px] font-semibold text-foreground">
          Próximos pagos
        </h1>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin pagos pendientes"
          description="No tenés vencimientos próximos"
        />
      ) : (
        <>
          {/* Total a pagar */}
          <section className="rounded-[20px] gradient-card p-5 text-white shadow-brand">
            <p className="text-[12px] font-medium opacity-80">Total a pagar</p>
            <Money
              amount={totalPagos}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight"
            />
            <p className="mt-1.5 text-[12px] opacity-80">
              {upcoming.length} tarjeta{upcoming.length === 1 ? "" : "s"} con vencimiento
            </p>
          </section>

          {/* Lista de pagos */}
          <section className="space-y-2.5">
            {upcoming.map(({ card, period, total, daysUntil }) => {
              const isUrgent = daysUntil <= 3;
              return (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="block rounded-[18px] border border-border bg-card p-4 transition-all active:scale-[0.985]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${card.color}20`, color: card.color }}
                    >
                      <Calendar className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {card.bank || card.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {capitalize(formatDate(period.due, "EEEE d 'de' MMM"))}
                      </p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <Money
                        amount={total}
                        className="block text-[15px] font-semibold tabular-nums text-foreground"
                      />
                      <p
                        className={
                          "mt-0.5 text-[11px] font-semibold " +
                          (isUrgent ? "text-destructive" : "text-muted-foreground")
                        }
                      >
                        {daysUntil <= 0
                          ? "Vence hoy"
                          : `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
