"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { SpendBars } from "@/components/stats/spend-bars";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { format, parseISO, subDays, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { toArs } from "@/lib/periods/calculate";
import type { Expense, Category, Card } from "@/lib/supabase/database.types";

type ExpenseWithCat = Expense & { category: Category | null };

interface StatsClientProps {
  expenses: ExpenseWithCat[];
  cards: Card[];
}

export function StatsClient({ expenses, cards }: StatsClientProps) {
  // Por defecto, últimos 30 días.
  const [desde, setDesde] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [hasta, setHasta] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [cardId, setCardId] = useState<string>("all");

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (cardId !== "all" && e.card_id !== cardId) return false;
      if (desde && e.expense_date < desde) return false;
      if (hasta && e.expense_date > hasta) return false;
      return true;
    });
  }, [expenses, cardId, desde, hasta]);

  // Granularidad del gráfico: por día en rangos cortos (≤ ~3 meses), por mes en
  // rangos largos. Así con el default de 30 días no queda en una sola barra.
  const byDay = useMemo(() => {
    if (!desde || !hasta) return false;
    return differenceInCalendarDays(parseISO(hasta), parseISO(desde)) <= 92;
  }, [desde, hasta]);

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = byDay ? e.expense_date : e.expense_date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + toArs(e, e.installment_amount));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({
        key,
        label: byDay
          ? format(parseISO(key), "d/M")
          : format(new Date(key + "-01T00:00:00"), "MMM", { locale: es }),
        amount,
      }));
  }, [filtered, byDay]);

  const rangeLabel =
    desde && hasta
      ? `${format(parseISO(desde), "d MMM", { locale: es })} – ${format(parseISO(hasta), "d MMM", { locale: es })}`
      : "Todo";

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

      {/* Filtros: rango de fechas (toco y elijo desde/hasta) + tarjeta */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0 space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">Desde</span>
            <DatePickerField value={desde} onChange={setDesde} placeholder="Desde" />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">Hasta</span>
            <DatePickerField value={hasta} onChange={setHasta} placeholder="Hasta" />
          </div>
        </div>
        <select
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="h-10 w-full appearance-none rounded-[12px] border border-border bg-card px-3 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">Todas las tarjetas</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.last_four ? ` •••• ${c.last_four}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Evolución del gasto (por día en rangos cortos, por mes en largos) */}
      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-foreground">
            {byDay ? "Gasto por día" : "Gasto por mes"}
          </p>
          <span className="text-[12px] text-muted-foreground">{rangeLabel}</span>
        </div>
        <SpendBars data={barData} />
      </section>
    </div>
  );
}
