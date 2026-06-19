"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SelectableExpenseList } from "@/components/expenses/selectable-expense-list";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { SelectableExpenseItem } from "@/components/expenses/selectable-expense-list";

interface CardExpenseSearchListProps {
  cardId: string;
  items: SelectableExpenseItem[];
}

export function CardExpenseSearchList({ cardId, items }: CardExpenseSearchListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const desc = it.expense.description?.toLowerCase() ?? "";
      const cat = (it.expense as { category?: { name?: string } }).category?.name?.toLowerCase() ?? "";
      return desc.includes(q) || cat.includes(q);
    });
  }, [items, query]);

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar consumos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "h-10 w-full rounded-[12px] border border-border bg-card pl-9 pr-9 text-[14px] text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/40"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<span>🔍</span>}
          title="Sin resultados"
          description={`No hay consumos que coincidan con "${query}"`}
        />
      ) : (
        <SelectableExpenseList cardId={cardId} items={filtered} />
      )}
    </div>
  );
}
