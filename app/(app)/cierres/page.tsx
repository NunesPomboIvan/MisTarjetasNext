import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { getCurrentPeriod, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Card, Expense } from "@/lib/supabase/database.types";

export const metadata = { title: "Cierre de tarjetas" };

export default async function CierresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: cards }, { data: expenses }] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*").eq("user_id", user!.id),
  ]);

  const allCards = (cards ?? []) as Card[];
  const allExpenses = (expenses ?? []) as Expense[];

  const todayStart = startOfDay(nowInArgentina());

  // Todas las tarjetas con el cierre de su PERÍODO ACTUAL, ordenadas por
  // proximidad de cierre (las que cierran antes, primero).
  const items = allCards
    .map((card) => {
      const cardExpenses = allExpenses.filter((e) => e.card_id === card.id);
      const period = getCurrentPeriod(card);
      const total = cardExpenses.reduce((s, e) => s + getAmountInPeriod(e, period), 0);
      const daysUntilClose = differenceInCalendarDays(period.end, todayStart);
      return { card, period, total, daysUntilClose };
    })
    .sort((a, b) => a.daysUntilClose - b.daysUntilClose);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="font-display text-[20px] font-semibold text-foreground">
          Cierre de tarjetas
        </h1>
        <div className="w-10" />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin tarjetas"
          description="Agregá una tarjeta para ver sus cierres"
        />
      ) : (
        <section className="space-y-2.5">
          {items.map(({ card, period, total, daysUntilClose }) => {
            const isToday = daysUntilClose <= 0;
            const isUrgent = daysUntilClose <= 1;
            const accent = card.color || "#6366f1";
            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="block rounded-[18px] border border-border bg-card p-4 transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    <CalendarClock className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {card.bank || card.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cierra {capitalize(formatDate(period.end, "EEEE d 'de' MMM"))}
                      {" · "}
                      vence {formatDate(period.due, "d 'de' MMM")}
                    </p>
                    <Money
                      amount={total}
                      className="mt-1 block text-[13px] font-semibold tabular-nums text-foreground"
                    />
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {isToday ? (
                      <p
                        className={
                          "font-display text-[15px] font-bold leading-none " +
                          (isUrgent ? "text-destructive" : "text-foreground")
                        }
                      >
                        Hoy
                      </p>
                    ) : (
                      <div className="flex items-baseline justify-end gap-1">
                        <p
                          className={
                            "font-display text-[18px] font-bold leading-none tabular-nums " +
                            (isUrgent ? "text-destructive" : "text-foreground")
                          }
                        >
                          {daysUntilClose}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {daysUntilClose === 1 ? "día" : "días"}
                        </p>
                      </div>
                    )}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      para cerrar
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
