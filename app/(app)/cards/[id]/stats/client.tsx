"use client";

import { useMemo, useState } from "react";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryDonut } from "@/components/stats/category-donut";
import { SpendBars } from "@/components/stats/spend-bars";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { toArs } from "@/lib/periods/calculate";
import type { Expense, Category } from "@/lib/supabase/database.types";

type ExpenseWithCat = Expense & { category: Category | null };

const RANGES = [
  { value: "month", label: "Este mes" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "all", label: "Todo" },
] as const;

interface CardStatsClientProps {
  expenses: ExpenseWithCat[];
}

export function CardStatsClient({ expenses }: CardStatsClientProps) {
  const [range, setRange] = useState<typeof RANGES[number]["value"]>("month");

  const filtered = useMemo(() => {
    if (range === "all") return expenses;
    const now = new Date();
    const start =
      range === "month"
        ? startOfMonth(now)
        : range === "3months"
        ? startOfMonth(subMonths(now, 2))
        : startOfMonth(subMonths(now, 5));
    const end = endOfMonth(now);
    return expenses.filter((e) => {
      const d = new Date(e.expense_date + "T00:00:00");
      return isWithinInterval(d, { start, end });
    });
  }, [expenses, range]);

  const total = filtered.reduce((s, e) => s + toArs(e, e.installment_amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; color: string; amount: number }>();
    for (const e of filtered) {
      const cat = e.category;
      const key = cat?.id ?? "none";
      const existing = map.get(key);
      const amount = (existing?.amount ?? 0) + toArs(e, e.installment_amount);
      map.set(key, {
        name: cat?.name ?? "Sin categoría",
        emoji: cat?.emoji ?? "❓",
        color: cat?.color_bg ?? "#94a3b8",
        amount,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const byDay = range === "month";
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const d = new Date(e.expense_date + "T00:00:00");
      const key = byDay ? e.expense_date : format(d, "yyyy-MM");
      map.set(key, (map.get(key) ?? 0) + toArs(e, e.installment_amount));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({
        key,
        label: byDay
          ? format(new Date(key + "T00:00:00"), "d/M")
          : format(new Date(key + "-01T00:00:00"), "MMM", { locale: es }),
        amount,
      }));
  }, [filtered, byDay]);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<span>📊</span>}
        title="Sin datos suficientes"
        description="Agregá algunos consumos para ver tus estadísticas"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtro de rango */}
      <div className="relative">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="h-10 w-full appearance-none rounded-[12px] border border-border bg-card pl-4 pr-9 text-[14px] font-medium text-foreground focus:border-primary focus:outline-none"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Donut por categoría */}
      <section className="rounded-[20px] border border-border bg-card p-5">
        <p className="text-[14px] font-semibold text-foreground">Consumos por categoría</p>
        <CategoryDonut categories={byCategory} total={total} />
      </section>

      {/* Gasto por período */}
      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-foreground">
            {byDay ? "Gasto por día" : "Gasto por mes"}
          </p>
          <span className="text-[12px] text-muted-foreground">
            {RANGES.find((r) => r.value === range)?.label}
          </span>
        </div>
        <SpendBars data={barData} />
      </section>

      {/* Total */}
      <section className="rounded-[18px] gradient-card p-5 text-white text-center">
        <p className="text-[12px] font-medium opacity-80">Total del período</p>
        <Money
          amount={total}
          className="mt-1 block font-display text-[26px] font-bold leading-none"
        />
      </section>
    </div>
  );
}
