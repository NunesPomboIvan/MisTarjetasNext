"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Money } from "@/components/shared/money";
import { parseLocalDate } from "@/lib/periods/calculate";
import { cn, formatDate } from "@/lib/utils";
import { CARD_TYPE_LABEL } from "@/lib/cards/card-type-label";
import type { CardType, Category, Expense } from "@/lib/supabase/database.types";

export type RecentExpense = Expense & {
  category: Category | null;
  card: { name: string; bank: string | null; last_four: string | null; type: CardType } | null;
};

/** "Macro · Visa 4016": banco, red y últimos 4 dígitos. */
function cardLabel(card: RecentExpense["card"]): string {
  if (!card) return "";
  const bank = card.bank || card.name;
  const brandAndNumber = [CARD_TYPE_LABEL[card.type], card.last_four].filter(Boolean).join(" ");
  return [bank, brandAndNumber].filter(Boolean).join(" · ");
}

/** Margen sobre la barra inferior (cubre el botón "+" que sobresale). */
const BOTTOM_GAP = 24;

/** Fecha de compra en formato "29/09/2026". */
function purchaseLabel(expenseDate: string): string {
  return formatDate(parseLocalDate(expenseDate), "dd/MM/yyyy");
}

interface RecentExpensesProps {
  expenses: RecentExpense[];
}

/**
 * Últimos consumos cargados (orden por created_at), con acceso al listado
 * completo. La home no scrollea: se muestran tantas filas como entren por
 * encima de la barra inferior (se mide al montar y al cambiar el tamaño).
 * La home se revalida desde las server actions de consumos
 * (revalidatePath("/", "layout")), así que la lista se actualiza sola al
 * cargar, editar o borrar.
 */
export function RecentExpenses({ expenses }: RecentExpensesProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const dataKey = expenses.map((e) => e.id).join(",");
  // Cantidad de filas que entran, asociada a la lista y al alto medidos.
  // Mientras no hay medición vigente se renderizan todas para poder medirlas.
  const [fit, setFit] = useState<{ key: string; count: number } | null>(null);
  const visibleCount = fit && fit.key === dataKey ? fit.count : expenses.length;

  useLayoutEffect(() => {
    function measure() {
      const list = listRef.current;
      const bar = document.querySelector<HTMLElement>("[data-bottom-bar]");
      if (!list || !bar) return;
      const limit = bar.getBoundingClientRect().top - BOTTOM_GAP;
      const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-row]"));
      let count = 0;
      for (const row of rows) {
        // +4 por el padding inferior del contenedor (py-1).
        if (row.getBoundingClientRect().bottom + 4 <= limit) count++;
        else break;
      }
      setFit({ key: dataKey, count: Math.max(1, count) });
    }
    if (!fit || fit.key !== dataKey) measure();

    function onResize() {
      setFit(null);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dataKey, fit]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Últimos consumos
        </h2>
        {expenses.length > 0 && (
          <Link
            href="/expenses"
            className="text-[12px] font-semibold text-primary transition-opacity active:opacity-70"
          >
            Ver todos
          </Link>
        )}
      </div>

      <div ref={listRef} className="glass-card rounded-[20px] px-5 py-1">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[13px] text-muted-foreground">Todavía no cargaste consumos</p>
            <Link
              href="/nuevo"
              className="btn-glass-primary inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold"
            >
              Cargar el primero
            </Link>
          </div>
        ) : (
          expenses.slice(0, visibleCount).map((expense, i) => {
            const cat = expense.category;
            const label = cardLabel(expense.card);
            const amount = expense.recurring ? expense.installment_amount : expense.total_amount;
            return (
              <div key={expense.id} data-row>
                {i > 0 && <div className="h-px bg-border dark:bg-white/[0.16]" />}
                <Link
                  href={`/expenses/${expense.id}`}
                  aria-label={`Ver consumo ${expense.description}`}
                  className="group flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[17px]"
                    style={{ background: cat ? cat.color_bg : "#0055A420" }}
                  >
                    {cat?.emoji ?? "🧾"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-tight text-foreground">
                      {expense.description}
                    </p>
                    {label && <p className="truncate text-[11.5px] text-muted-foreground">{label}</p>}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end">
                    <Money
                      amount={amount}
                      currency={expense.currency}
                      className={cn(
                        "text-[14px] font-semibold leading-tight tabular-nums text-foreground",
                        amount < 0 && "text-emerald-600 dark:text-emerald-400"
                      )}
                    />
                    <span className="text-[11.5px] text-muted-foreground">
                      {purchaseLabel(expense.expense_date)}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
