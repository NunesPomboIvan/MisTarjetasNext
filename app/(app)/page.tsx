import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { WalletCard } from "@/components/cards/wallet-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardQuickAdd } from "@/components/shared/card-quick-add";
import { getCurrentPeriod, expenseFallsInPeriod } from "@/lib/periods/calculate";
import { formatDate, capitalize } from "@/lib/utils";
import type { Card, Expense, Category } from "@/lib/supabase/database.types";

export const metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cardsResult, expensesResult] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user!.id).eq("archived", false).order("created_at"),
    supabase.from("expenses").select("*, category:categories(*)").eq("user_id", user!.id).order("expense_date", { ascending: false }),
  ]);

  const cards = (cardsResult.data ?? []) as Card[];
  const allExpenses = (expensesResult.data ?? []) as Array<Expense & { category: Category | null }>;

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user!.id},user_id.is.null`)
    .order("is_preset", { ascending: false })
    .order("name");
  const categories = (categoriesData ?? []) as Category[];

  // Totales por tarjeta
  const cardSummaries = cards.map((card) => {
    const period = getCurrentPeriod(card);
    const periodExpenses = allExpenses.filter(
      (e) => e.card_id === card.id && expenseFallsInPeriod(e, period)
    );
    const total = periodExpenses.reduce((s, e) => s + e.installment_amount, 0);
    return { card, period, total };
  });

  const grandTotal = cardSummaries.reduce((s, c) => s + c.total, 0);

  // Próximo vencimiento — agrupado si hay varias tarjetas en la misma fecha
  const cardsSortedByDue = cardSummaries
    .filter((c) => c.total > 0)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());
  const soonestDueTime = cardsSortedByDue[0]?.period.due.getTime();
  const nextDueGroup = soonestDueTime
    ? cardsSortedByDue.filter((c) => c.period.due.getTime() === soonestDueTime)
    : [];

  // Saludo con fecha de hoy — un único `now` que también alimenta el cálculo
  // de "días para vencer". Tomarlo en una const evita la regla de pureza del
  // compilador de React (Date.now() es impura).
  const today = new Date();

  // Días faltantes para el próximo vencimiento
  const daysUntilDue = nextDueGroup.length
    ? Math.ceil(
        (nextDueGroup[0].period.due.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Actividad reciente (últimos 5)
  const recientes = [...allExpenses]
    .sort((a, b) => (b.expense_date > a.expense_date ? 1 : -1))
    .slice(0, 5);

  const dateLabel = capitalize(formatDate(today, "EEEE, d 'de' MMMM"));
  const userName = (user?.email?.split("@")[0] ?? "").split(/[._-]/)[0];
  const displayName = userName ? capitalize(userName) : "";

  return (
    <div className="relative space-y-7">
      {/* Halo cálido decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-16 h-80 w-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--halo-light), transparent 70%)",
        }}
      />

      {/* Header saludo */}
      <header className="relative">
        <p className="text-[13px] text-muted-foreground">{dateLabel}</p>
        <h1 className="mt-0.5 font-display text-[28px] font-bold tracking-tight text-foreground">
          {displayName ? `Hola, ${displayName}` : "Hola"}
        </h1>
      </header>

      {cards.length === 0 ? (
        <EmptyState
          icon={<span>💳</span>}
          title="Bienvenido a Mis Tarjetas"
          description="Agregá tu primera tarjeta para empezar"
          action={{ label: "Agregar tarjeta", href: "/cards/new" }}
        />
      ) : (
        <>
          {/* Total del período + meta */}
          <section className="relative overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44"
              style={{
                borderRadius: "50% 50% 60% 40%",
                background:
                  "radial-gradient(circle, oklch(0.88 0.14 35 / 0.45), transparent 65%)",
              }}
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Total del período
              </p>
              <Money
                amount={grandTotal}
                className="mt-1.5 block font-display text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground"
              />

              <div className="mt-5 flex gap-4 border-t border-border pt-5">
                {nextDueGroup.length > 0 ? (
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Próximo venc.
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-foreground">
                      {formatDate(nextDueGroup[0].period.due, "d 'de' MMM")}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-primary">
                      {daysUntilDue <= 0
                        ? "Vence hoy"
                        : `en ${daysUntilDue} día${daysUntilDue === 1 ? "" : "s"}`}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Próximo venc.
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-foreground">
                      Sin vencimientos
                    </p>
                  </div>
                )}
                <div className="w-px bg-border" />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Tarjetas
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {cards.length} activa{cards.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cards.length} ARS
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tarjetas */}
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Mis tarjetas
              </h2>
              <Link
                href="/cards"
                className="text-[13px] font-semibold text-primary"
              >
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {cardSummaries.map(({ card, period, total }) => (
                <div
                  key={card.id}
                  className="relative flex items-center gap-2"
                >
                  <Link
                    href={`/cards/${card.id}`}
                    className="block flex-1 transition-all active:scale-[0.99]"
                  >
                    <WalletCard
                      card={card}
                      total={total}
                      compact
                    />
                  </Link>
                  <div className="absolute right-3 top-3 z-10">
                    <CardQuickAdd
                      cardId={card.id}
                      cards={cards}
                      categories={categories}
                    />
                  </div>
                  <div className="sr-only">
                    Vence {formatDate(period.due, "d/M")}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actividad reciente */}
          {recientes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Actividad reciente
                </h2>
                <Link
                  href="/expenses"
                  className="text-[13px] font-semibold text-primary"
                >
                  Ver todo
                </Link>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-border bg-card">
                {recientes.map((exp, i) => {
                  const card = cards.find((c) => c.id === exp.card_id);
                  const cat = exp.category;
                  return (
                    <Link
                      key={exp.id}
                      href={`/expenses/${exp.id}/edit`}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                      style={{
                        borderBottom:
                          i < recientes.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <div
                        className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl text-base"
                        style={{
                          backgroundColor: cat?.color_bg ?? "var(--muted)",
                          color: cat?.color_text ?? "var(--muted-foreground)",
                        }}
                      >
                        {cat?.emoji ?? "•"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-foreground">
                          {exp.description}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(exp.expense_date + "T00:00:00", "d 'de' MMM")}
                          {card ? ` · ${card.name.split(" ")[0]}` : ""}
                          {exp.installments > 1
                            ? ` · ${exp.installments} cuotas`
                            : ""}
                        </p>
                      </div>
                      <Money
                        amount={exp.installment_amount}
                        currency={exp.currency}
                        className="text-[15px] font-semibold text-foreground"
                      />
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
