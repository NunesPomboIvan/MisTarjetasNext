"use client";

import { useMemo, useState } from "react";
import { Sparkles, TrendingUp, Receipt } from "lucide-react";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryDonut } from "@/components/stats/category-donut";
import { SpendBars } from "@/components/stats/spend-bars";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { toArs } from "@/lib/periods/calculate";
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
      <div className="space-y-4">
        <StickyPageHeader>
          <div className="flex items-center justify-between">
            <BackButton />
            <h1 className="text-[15px] font-semibold text-foreground">Estadísticas</h1>
            <div className="w-10" />
          </div>
        </StickyPageHeader>
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
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[15px] font-semibold text-foreground">Estadísticas</h1>
          <div className="w-10" />
        </div>
      </StickyPageHeader>

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

      {/* Total del período — card con detalles */}
      <section
        className="relative overflow-hidden rounded-[20px] border p-5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.21 25 / 0.20) 0%, oklch(0.6 0.22 330 / 0.14) 45%, var(--card) 78%)",
          borderColor: "oklch(0.62 0.21 25 / 0.25)",
        }}
      >
        {/* Glow coral superior-derecho */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.21 25 / 0.50) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        {/* Glow magenta inferior-izquierdo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.66 0.22 340 / 0.45) 0%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />
        {/* Brillo diagonal */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, transparent 50%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.68 0.2 30), oklch(0.6 0.22 330))",
                boxShadow: "0 6px 16px -6px oklch(0.62 0.21 25 / 0.6)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total del período
            </p>
          </div>

          <Money
            amount={total}
            className="mt-3 block font-display text-[32px] font-bold leading-none text-foreground"
          />

          <div className="mt-4 flex items-stretch gap-3 border-t border-border/50 pt-3">
            <div className="flex flex-1 items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Receipt className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Consumos
                </p>
                <p className="text-[14px] font-bold tabular-nums text-foreground">
                  {filtered.length}
                </p>
              </div>
            </div>
            <div className="w-px bg-border/60" />
            <div className="flex flex-1 items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{
                  background: "oklch(0.66 0.22 340 / 0.15)",
                  color: "oklch(0.66 0.22 340)",
                }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Promedio
                </p>
                <Money
                  amount={filtered.length > 0 ? total / filtered.length : 0}
                  className="text-[14px] font-bold tabular-nums text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
