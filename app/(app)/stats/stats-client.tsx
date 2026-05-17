"use client";

import { useMemo, useState } from "react";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryDonut } from "@/components/stats/category-donut";
import { ExpenseLineChart } from "@/components/stats/expense-line-chart";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from "date-fns";
import { BackButton } from "@/components/shared/back-button";
import type { Expense, Category, Card } from "@/lib/supabase/database.types";

type ExpenseWithCat = Expense & { category: Category | null };

const RANGES = [
  { value: "month", label: "Este mes" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "all", label: "Todo" },
] as const;

interface StatsClientProps {
  expenses: ExpenseWithCat[];
  cards: Card[];
}

export function StatsClient({ expenses, cards }: StatsClientProps) {
  const [range, setRange] = useState<typeof RANGES[number]["value"]>("month");
  const [cardId, setCardId] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = expenses;
    if (cardId !== "all") {
      result = result.filter((e) => e.card_id === cardId);
    }
    if (range !== "all") {
      const now = new Date();
      const start =
        range === "month"
          ? startOfMonth(now)
          : range === "3months"
          ? startOfMonth(subMonths(now, 2))
          : startOfMonth(subMonths(now, 5));
      const end = endOfMonth(now);
      result = result.filter((e) => {
        const d = new Date(e.expense_date + "T00:00:00");
        return isWithinInterval(d, { start, end });
      });
    }
    return result;
  }, [expenses, range, cardId]);

  const total = filtered.reduce((s, e) => s + e.installment_amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; color: string; amount: number }>();
    for (const e of filtered) {
      const cat = e.category;
      const key = cat?.id ?? "none";
      const existing = map.get(key);
      const amount = (existing?.amount ?? 0) + e.installment_amount;
      map.set(key, {
        name: cat?.name ?? "Sin categoría",
        emoji: cat?.emoji ?? "❓",
        color: cat?.color_bg ?? "#94a3b8",
        amount,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const lineData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of filtered) {
      const key = e.expense_date;
      byDay.set(key, (byDay.get(key) ?? 0) + e.installment_amount);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date,
        label: format(new Date(date + "T00:00:00"), "d MMM"),
        amount,
      }));
  }, [filtered]);

  if (expenses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[15px] font-semibold text-foreground">Estadísticas</h1>
          <div className="w-10" />
        </div>
        <EmptyState
          icon={<span>📊</span>}
          title="Sin datos suficientes"
          description="Agregá algunos consumos para ver tus estadísticas"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Estadísticas</h1>
        <div className="w-10" />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2.5">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="h-10 appearance-none rounded-[12px] border border-border bg-card px-3 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="h-10 appearance-none rounded-[12px] border border-border bg-card px-3 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">Todas las tarjetas</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Donut por categoría */}
      <section className="rounded-[20px] border border-border bg-card p-5">
        <p className="text-[14px] font-semibold text-foreground">Consumos por categoría</p>
        <CategoryDonut categories={byCategory} total={total} />
      </section>

      {/* Evolución */}
      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-foreground">Evolución de consumos</p>
          <span className="text-[12px] text-muted-foreground">
            {RANGES.find((r) => r.value === range)?.label}
          </span>
        </div>
        <ExpenseLineChart data={lineData} />
      </section>

      {/* Total */}
      <section className="rounded-[18px] gradient-card p-5 text-center text-white">
        <p className="text-[12px] font-medium opacity-80">Total del período</p>
        <Money
          amount={total}
          className="mt-1 block font-display text-[26px] font-bold leading-none"
        />
      </section>
    </div>
  );
}
