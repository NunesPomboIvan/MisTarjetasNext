"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell as BarCell,
} from "recharts";
import { Money } from "@/components/shared/money";
import { formatCurrency } from "@/lib/utils";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { Expense, Category, Card } from "@/lib/supabase/database.types";

interface StatsClientProps {
  expenses: Array<Expense & { category: Category | null }>;
  cards: Card[];
}

// Paleta cálida basada en el design — usa hues consistentes con el tema warm
const CHART_COLORS = [
  "oklch(0.65 0.18 35)",   // terracotta
  "oklch(0.72 0.16 60)",   // amber
  "oklch(0.65 0.18 142)",  // sage
  "oklch(0.62 0.18 280)",  // plum
  "oklch(0.62 0.16 215)",  // teal
  "oklch(0.65 0.18 25)",   // burnt-orange
  "oklch(0.7 0.14 320)",   // rose
  "oklch(0.65 0.16 100)",  // ochre
];

export function StatsClient({ expenses }: StatsClientProps) {
  // --- Gastos por categoría (todos los tiempos) ---
  const byCategory = useMemo(() => {
    const totals: Record<
      string,
      { name: string; emoji: string; value: number }
    > = {};
    for (const e of expenses) {
      const key = e.category?.name ?? "Sin categoría";
      const emoji = e.category?.emoji ?? "📦";
      if (!totals[key]) totals[key] = { name: key, emoji, value: 0 };
      totals[key].value += e.installment_amount;
    }
    return Object.values(totals)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  // --- Gasto mensual (últimos 6 meses, tipo bar chart como el prototipo) ---
  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        label: format(d, "MMM", { locale: es }),
        start: startOfMonth(d),
        end: endOfMonth(d),
        total: 0,
        isCurrent: i === 5,
      };
    });

    for (const e of expenses) {
      const expDate = new Date(e.expense_date + "T00:00:00");
      for (const m of months) {
        if (expDate >= m.start && expDate <= m.end) {
          m.total += e.installment_amount;
        }
      }
    }
    return months.map(({ label, total, isCurrent }) => ({
      label,
      total: Math.round(total),
      isCurrent,
    }));
  }, [expenses]);

  // Mes actual y comparación con el anterior
  const currentMonthTotal = monthlyTrend[5]?.total ?? 0;
  const prevMonthTotal = monthlyTrend[4]?.total ?? 0;
  const monthOverMonth =
    prevMonthTotal > 0
      ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
      : 0;

  // --- Top 5 consumos ---
  const top5 = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5),
    [expenses]
  );

  return (
    <div className="relative space-y-5">
      {/* Halo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--halo-light), transparent 70%)",
        }}
      />

      <h1 className="relative font-display text-[28px] font-bold tracking-tight text-foreground">
        Estadísticas
      </h1>

      {/* Tendencia mensual + comparación */}
      <section className="relative overflow-hidden rounded-[26px] border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40"
          style={{
            borderRadius: "60% 40% 50% 50%",
            background: "oklch(0.88 0.14 35 / 0.4)",
          }}
        />
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">
            {format(new Date(), "MMMM yyyy", { locale: es })}
          </p>
          <Money
            amount={currentMonthTotal}
            className="mt-1 block font-display text-[36px] font-semibold tracking-tight text-foreground"
          />
          <div className="mt-1.5 flex items-center gap-2 text-[13px]">
            <span
              className={`font-bold ${
                monthOverMonth >= 0 ? "text-primary" : "text-emerald-600"
              }`}
            >
              {monthOverMonth >= 0 ? "↑" : "↓"} {Math.abs(monthOverMonth)}%
            </span>
            <span className="text-muted-foreground">vs mes anterior</span>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: unknown) => formatCurrency(Number(v))}
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 4, 4]}>
                  {monthlyTrend.map((m, i) => (
                    <BarCell
                      key={i}
                      fill={
                        m.isCurrent
                          ? "var(--primary)"
                          : "oklch(from var(--primary) l c h / 0.35)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Donut por categoría */}
      {byCategory.length > 0 && (
        <section className="rounded-[26px] border border-border bg-card p-6">
          <h2 className="font-display text-base font-semibold text-foreground">
            Por categoría
          </h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-[140px] w-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    dataKey="value"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => formatCurrency(Number(value))}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(_: any, payload: readonly any[]) =>
                      `${payload[0]?.payload?.emoji} ${payload[0]?.payload?.name}`
                    }
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Categorías
                </p>
                <p className="font-display text-[22px] font-semibold text-foreground">
                  {byCategory.length}
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              {byCategory.slice(0, 5).map((cat, i) => {
                const grand = byCategory.reduce((s, c) => s + c.value, 0);
                const pct = Math.round((cat.value / grand) * 100);
                return (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="flex-1 truncate text-xs font-medium text-foreground">
                      {cat.name}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Top 5 consumos */}
      {top5.length > 0 && (
        <section className="rounded-[26px] border border-border bg-card p-6">
          <h2 className="font-display text-base font-semibold text-foreground">
            Top 5 consumos
          </h2>
          <div className="mt-4 space-y-3">
            {top5.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {e.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.expense_date}
                  </p>
                </div>
                <Money amount={e.total_amount} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
