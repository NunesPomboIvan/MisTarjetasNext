import Link from "next/link";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { getNextPayment } from "@/lib/periods/calculate";
import { nowInArgentina, formatWeekdayLongDate } from "@/lib/utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Card, Expense } from "@/lib/supabase/database.types";

export const metadata = { title: "Próximos vencimientos" };

export default async function PagosPage() {
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

  const [{ data: cards }, { data: expenses }] = await Promise.all([
    cardsQuery,
    supabase.from("expenses").select("*").eq("user_id", user!.id),
  ]);

  const allCards = (cards ?? []) as Card[];
  const allExpenses = (expenses ?? []) as Expense[];

  const todayStart = startOfDay(nowInArgentina());

  const upcoming = allCards
    .map((card) => {
      const cardExpenses = allExpenses.filter((e) => e.card_id === card.id);
      const payment = getNextPayment(card, cardExpenses);
      if (!payment) return null;
      const daysUntil = differenceInCalendarDays(payment.period.due, todayStart);
      return { card, period: payment.period, total: payment.total, daysUntil };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());

  const totalPagos = upcoming.reduce((s, u) => s + u.total, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href="/" />
          <h1 className="font-display text-[20px] font-semibold text-foreground">
            Próximos vencimientos
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </StickyPageHeader>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin pagos pendientes"
          description="No tenés vencimientos próximos"
        />
      ) : (
        <>
          {/* Total a pagar — mismo look que el saldo del home (glass-card oscuro con halo violeta) */}
          <section className="glass-card rounded-[20px] px-5 py-[18px]">
            <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
            <Money
              amount={totalPagos}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
            />
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {upcoming.length} tarjeta{upcoming.length === 1 ? "" : "s"} con vencimiento
            </p>
          </section>

          {/* Lista de pagos */}
          <section className="space-y-2.5">
            {upcoming.map(({ card, period, total, daysUntil }) => {
              const isToday = daysUntil <= 0;
              const isUrgent = daysUntil <= 1;
              const accent = card.color || "#6366f1";
              return (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="block rounded-[20px] border border-white/[0.08] bg-card/85 p-4 backdrop-blur-xl transition-all active:scale-[0.985]"
                  style={{
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    boxShadow:
                      "0 0 28px -8px rgba(129,140,248,0.22), 0 14px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${accent}20`, color: accent }}
                    >
                      <Calendar className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {card.bank || card.name}
                        <span className="ml-1.5 text-[12px] font-normal tabular-nums text-muted-foreground">
                          •••• {card.last_four}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatWeekdayLongDate(period.due)}
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
                            {daysUntil}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {daysUntil === 1 ? "día" : "días"}
                          </p>
                        </div>
                      )}
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        para vencer
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
