"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
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

const CHART_COLORS = ["#f97316","#fb923c","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

export function StatsClient({ expenses, cards }: StatsClientProps) {
  // --- Gastos por categoría (todos los tiempos) ---
  const byCategory = useMemo(() => {
    const totals: Record<string, { name: string; emoji: string; value: number }> = {};
    for (const e of expenses) {
      const key = e.category?.name ?? "Sin categoría";
      const emoji = e.category?.emoji ?? "📦";
      if (!totals[key]) totals[key] = { name: key, emoji, value: 0 };
      totals[key].value += e.installment_amount;
    }
    return Object.values(totals).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [expenses]);

  // --- Gasto mensual (últimos 12 meses) ---
  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      return {
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: es }),
        start: startOfMonth(d),
        end: endOfMonth(d),
        total: 0,
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
    return months.map(({ label, total }) => ({ label, total: Math.round(total) }));
  }, [expenses]);

  // --- Top 5 consumos ---
  const top5 = useMemo(() =>
    [...expenses].sort((a, b) => b.total_amount - a.total_amount).slice(0, 5),
  [expenses]);

  const totalAllTime = expenses.reduce((s, e) => s + e.total_amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Estadísticas</h1>

      {/* Total general */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total histórico registrado</p>
        <Money amount={totalAllTime} gradient size="2xl" className="mt-1 block" />
        <p className="mt-1 text-xs text-muted-foreground">{expenses.length} consumos</p>
      </div>

      {/* Donut por categoría */}
      {byCategory.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Por categoría</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                paddingAngle={2}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatCurrency(Number(value))}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(_: any, payload: readonly any[]) => payload[0]?.payload?.emoji + " " + payload[0]?.payload?.name}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {byCategory.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="flex-1 text-sm">{cat.emoji} {cat.name}</span>
                <Money amount={cat.value} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencia mensual */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Últimos 12 meses</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={45} />
            <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#f97316" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 consumos */}
      {top5.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Top 5 consumos más altos</h2>
          <div className="space-y-2">
            {top5.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.expense_date}</p>
                </div>
                <Money amount={e.total_amount} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
