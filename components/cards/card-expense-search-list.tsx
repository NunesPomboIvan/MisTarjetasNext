"use client";

import { useId, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/expenses/amount-input";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { SelectableExpenseList } from "@/components/expenses/selectable-expense-list";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toArs, getInstallmentAmountForIndex } from "@/lib/periods/calculate";
import type { SelectableExpenseItem } from "@/components/expenses/selectable-expense-list";

interface CardExpenseSearchListProps {
  cardId: string;
  items: SelectableExpenseItem[];
  /** Acciones (Fijo / Gastos / Agregar) para la fila de la toolbar. */
  actions?: React.ReactNode;
  /** Oculta el botón "Seleccionar" de la toolbar. Default true. */
  showSelectToggle?: boolean;
}

type Tipo = "todos" | "gastos" | "reintegros";
type Cuotas = "todas" | "una" | "varias";

interface Filters {
  categoryId: string | null;
  tipo: Tipo;
  desde: string;
  hasta: string;
  min: number | undefined;
  max: number | undefined;
  cuotas: Cuotas;
  comercio: string;
  soloFijos: boolean;
}

const EMPTY_FILTERS: Filters = {
  categoryId: null,
  tipo: "todos",
  desde: "",
  hasta: "",
  min: undefined,
  max: undefined,
  cuotas: "todas",
  comercio: "",
  soloFijos: false,
};

/** Monto del item ya expresado en pesos, para los filtros de importe y tipo. */
function arsAmountOf(it: SelectableExpenseItem): number {
  const idx = it.installmentIndex;
  const base =
    idx !== undefined && idx >= 0
      ? getInstallmentAmountForIndex(it.expense, idx)
      : it.expense.installment_amount;
  return toArs(it.expense, base);
}

function countActive(f: Filters): number {
  let n = 0;
  if (f.categoryId) n++;
  if (f.tipo !== "todos") n++;
  if (f.desde) n++;
  if (f.hasta) n++;
  if (f.min != null) n++;
  if (f.max != null) n++;
  if (f.cuotas !== "todas") n++;
  if (f.comercio.trim()) n++;
  if (f.soloFijos) n++;
  return n;
}

export function CardExpenseSearchList({ cardId, items, actions, showSelectToggle }: CardExpenseSearchListProps) {
  const [query, setQuery] = useState("");
  const searchInputId = useId();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);

  // Categorías presentes en los consumos del período (para el filtro).
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string }>();
    for (const it of items) {
      const c = it.expense.category;
      if (c && !map.has(c.id)) map.set(c.id, { id: c.id, name: c.name, emoji: c.emoji });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const activeCount = countActive(filters);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const comercio = filters.comercio.trim().toLowerCase();
    const min = filters.min ?? null;
    const max = filters.max ?? null;

    return items.filter((it) => {
      const desc = it.expense.description?.toLowerCase() ?? "";
      const catName = it.expense.category?.name?.toLowerCase() ?? "";

      // Búsqueda de texto (combina con los filtros).
      if (q && !desc.includes(q) && !catName.includes(q)) return false;
      if (comercio && !desc.includes(comercio)) return false;

      // Categoría.
      if (filters.categoryId && it.expense.category?.id !== filters.categoryId) return false;

      // Solo consumos fijos.
      if (filters.soloFijos && !it.expense.recurring) return false;

      // Cuotas.
      if (filters.cuotas === "una" && it.expense.installments > 1) return false;
      if (filters.cuotas === "varias" && it.expense.installments <= 1) return false;

      // Tipo de movimiento (por signo del importe).
      const ars = arsAmountOf(it);
      if (filters.tipo === "gastos" && ars < 0) return false;
      if (filters.tipo === "reintegros" && ars >= 0) return false;

      // Rango de importe (sobre el valor absoluto en pesos).
      const abs = Math.abs(ars);
      if (min != null && abs < min) return false;
      if (max != null && abs > max) return false;

      // Fechas (expense_date es "yyyy-MM-dd": comparación lexicográfica válida).
      const date = it.expense.expense_date;
      if (filters.desde && date < filters.desde) return false;
      if (filters.hasta && date > filters.hasta) return false;

      return true;
    });
  }, [items, query, filters]);

  function openSheet() {
    setDraft(filters);
    setSheetOpen(true);
  }
  function applyDraft() {
    setFilters(draft);
    setSheetOpen(false);
  }
  function clearDraft() {
    setDraft(EMPTY_FILTERS);
  }

  const hasAnyFilter = activeCount > 0 || query.trim().length > 0;

  // Buscador + botón de filtros (se inserta entre "Seleccionar" y la lista).
  const searchBar = (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <label htmlFor={searchInputId} className="sr-only">
          Buscar consumos
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={searchInputId}
          type="search"
          placeholder="Ej: supermercado, Netflix..."
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
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "relative inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-[12px] border px-3 text-[13px] font-semibold transition-colors",
          activeCount > 0
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-card text-foreground/80 hover:text-foreground"
        )}
        aria-label="Filtros"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={<span>🔍</span>}
      title="Sin resultados"
      description={
        hasAnyFilter
          ? "No hay consumos que coincidan con la búsqueda o los filtros"
          : "No hay consumos en este período"
      }
    />
  );

  return (
    <>
      <SelectableExpenseList
        cardId={cardId}
        items={filtered}
        actions={actions}
        showSelectToggle={showSelectToggle}
        afterToolbar={searchBar}
        emptyState={emptyState}
      />

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
        onApply={applyDraft}
        onClear={clearDraft}
      />
    </>
  );
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  categories: { id: string; name: string; emoji: string }[];
  onApply: () => void;
  onClear: () => void;
}

function FilterSheet({
  open,
  onOpenChange,
  draft,
  setDraft,
  categories,
  onApply,
  onClear,
}: FilterSheetProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-0">
        <SheetHeader className="px-5 pb-1">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-2">
          {/* Categoría */}
          {categories.length > 0 && (
            <FilterGroup label="Categoría">
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={draft.categoryId === null}
                  onClick={() => set("categoryId", null)}
                >
                  Todas
                </Chip>
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    active={draft.categoryId === c.id}
                    onClick={() => set("categoryId", c.id)}
                  >
                    {c.emoji} {c.name}
                  </Chip>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Tipo de movimiento */}
          <FilterGroup label="Tipo de movimiento">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["todos", "Todos"],
                  ["gastos", "Gastos"],
                  ["reintegros", "Reintegros"],
                ] as [Tipo, string][]
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  active={draft.tipo === value}
                  onClick={() => set("tipo", value)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {/* Cuotas */}
          <FilterGroup label="Cuotas">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["todas", "Todas"],
                  ["una", "Sin cuotas"],
                  ["varias", "En cuotas"],
                ] as [Cuotas, string][]
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  active={draft.cuotas === value}
                  onClick={() => set("cuotas", value)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          {/* Fecha */}
          <FilterGroup label="Fecha">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1">
                <span className="block text-[11px] text-muted-foreground">Desde</span>
                <DatePickerField
                  value={draft.desde}
                  onChange={(v) => set("desde", v)}
                  placeholder="Desde"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <span className="block text-[11px] text-muted-foreground">Hasta</span>
                <DatePickerField
                  value={draft.hasta}
                  onChange={(v) => set("hasta", v)}
                  placeholder="Hasta"
                />
              </div>
            </div>
          </FilterGroup>

          {/* Importe */}
          <FilterGroup label="Importe (pesos)">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Mínimo</span>
                <AmountInput
                  value={draft.min}
                  onChange={(v) => set("min", v)}
                  placeholder="0"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Máximo</span>
                <AmountInput
                  value={draft.max}
                  onChange={(v) => set("max", v)}
                  placeholder="Sin límite"
                />
              </label>
            </div>
          </FilterGroup>

          {/* Comercio o descripción */}
          <FilterGroup label="Comercio o descripción">
            <Input
              type="text"
              placeholder="Ej: Supermercado"
              value={draft.comercio}
              onChange={(e) => set("comercio", e.target.value)}
            />
          </FilterGroup>

          {/* Solo consumos fijos */}
          <button
            type="button"
            onClick={() => set("soloFijos", !draft.soloFijos)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3 text-left"
          >
            <span className="text-[14px] font-medium text-foreground">
              Mostrar solo consumos fijos
            </span>
            <span
              className={cn(
                "relative h-6 w-10 flex-shrink-0 rounded-full transition-colors",
                draft.soloFijos ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  draft.soloFijos ? "translate-x-[18px]" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
        </div>

        <SheetFooter className="flex-row gap-2 px-5">
          <button
            type="button"
            onClick={onClear}
            className="h-11 flex-1 rounded-full border border-border bg-card text-[14px] font-semibold text-foreground/80 transition-colors active:bg-muted/60"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-11 flex-1 rounded-full gradient-primary text-[14px] font-semibold text-white shadow-brand"
          >
            Aplicar filtros
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground/70 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
