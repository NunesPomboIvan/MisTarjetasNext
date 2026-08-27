"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Archive, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoanSummaryCard } from "@/components/loans/loan-summary-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Loan } from "@/lib/supabase/database.types";

export interface LoanItem {
  loan: Loan;
  pendingAmount: number;
  paidAmount: number;
  paidCount: number;
  totalCount: number;
  overdueCount: number;
}

type SortKey = "name" | "debt-desc" | "debt-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Nombre (A-Z)" },
  { value: "debt-desc", label: "Mayor adeudado" },
  { value: "debt-asc", label: "Menor adeudado" },
];

const STORAGE_KEY = "prestamos:sort";
const STORAGE_EVENT = "prestamos:sort-change";
const DEFAULT_SORT: SortKey = "name";

/** Filtro de visualización "Solo activos" (oculta los préstamos cancelados). */
const ONLY_ACTIVE_KEY = "prestamos:only-active";
const ONLY_ACTIVE_DEFAULT = true;

/** Un préstamo está cancelado cuando todas sus cuotas están pagadas. */
function isCancelled(item: LoanItem): boolean {
  return item.totalCount > 0 && item.paidCount >= item.totalCount;
}

function isSortKey(v: string | null): v is SortKey {
  return !!v && SORT_OPTIONS.some((o) => o.value === v);
}

/**
 * Lee/escribe el criterio de orden en localStorage como un store externo.
 * Usamos useSyncExternalStore para que la preferencia persista entre visitas
 * sin provocar mismatch de hidratación ni setState dentro de un efecto.
 */
function subscribe(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function usePersistentSort(): [SortKey, (next: SortKey) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null
  );
  const sort = isSortKey(stored) ? stored : DEFAULT_SORT;

  const setSort = (next: SortKey) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  return [sort, setSort];
}

function usePersistentOnlyActive(): [boolean, (next: boolean) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(ONLY_ACTIVE_KEY),
    () => null
  );
  const onlyActive = stored === null ? ONLY_ACTIVE_DEFAULT : stored === "1";

  const setOnlyActive = (next: boolean) => {
    try {
      localStorage.setItem(ONLY_ACTIVE_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  return [onlyActive, setOnlyActive];
}

function loanName(item: LoanItem): string {
  return (item.loan.bank || item.loan.description || "").trim();
}

function sortItems(items: LoanItem[], sort: SortKey): LoanItem[] {
  const copy = [...items];
  switch (sort) {
    case "name":
      copy.sort((a, b) =>
        loanName(a).localeCompare(loanName(b), "es", { sensitivity: "base" })
      );
      break;
    case "debt-desc":
      copy.sort((a, b) => b.pendingAmount - a.pendingAmount);
      break;
    case "debt-asc":
      copy.sort((a, b) => a.pendingAmount - b.pendingAmount);
      break;
  }
  return copy;
}

interface LoanListProps {
  active: LoanItem[];
  archived: LoanItem[];
}

export function LoanList({ active, archived }: LoanListProps) {
  const [sort, changeSort] = usePersistentSort();
  const [onlyActive, setOnlyActive] = usePersistentOnlyActive();

  const sortedActive = sortItems(active, sort);
  const sortedArchived = sortItems(archived, sort);

  const cancelledCount = active.filter(isCancelled).length;
  const visibleActive = onlyActive
    ? sortedActive.filter((i) => !isCancelled(i))
    : sortedActive;

  return (
    <div className="space-y-5">
      {/* Fila de controles: filtro "Solo activos" (izq.) + orden (der.).
          Margen negativo para acercar al header de arriba. */}
      <div className="-mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOnlyActive(!onlyActive)}
          aria-pressed={onlyActive}
          className={cn(
            "inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
            onlyActive
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-card text-foreground/70 hover:text-foreground"
          )}
        >
          <Check
            className={cn("h-3.5 w-3.5", onlyActive ? "opacity-100" : "opacity-40")}
          />
          Solo activos
        </button>
        <Select value={sort} onValueChange={(v) => changeSort(v as SortKey)}>
          <SelectTrigger size="sm" aria-label="Ordenar préstamos">
            {/* Label explícito: si no lo pasamos, hasta que el desplegable
                se abre una vez, muestra el value crudo en vez de la
                etiqueta ("Nombre (A-Z)", etc). */}
            <SelectValue>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
            </SelectValue>
          </SelectTrigger>
          {/* w-auto: el ancho del desplegable no debe copiar el del trigger
              (que varía según la opción elegida), o las opciones más largas
              quedan recortadas. */}
          <SelectContent align="end" className="w-auto min-w-[200px]">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleActive.length > 0 && <StackedLoans items={visibleActive} />}

      {onlyActive && cancelledCount > 0 && (
        <button
          type="button"
          onClick={() => setOnlyActive(false)}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver {cancelledCount} préstamo{cancelledCount !== 1 ? "s" : ""} cancelado
          {cancelledCount !== 1 ? "s" : ""}
        </button>
      )}

      {visibleActive.length === 0 && cancelledCount > 0 && onlyActive && (
        <p className="py-4 text-center text-[13px] text-muted-foreground">
          No tenés préstamos activos.
        </p>
      )}

      {sortedArchived.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm text-muted-foreground">
            <Archive className="h-4 w-4" />
            <span>
              {sortedArchived.length} préstamo
              {sortedArchived.length !== 1 ? "s" : ""} archivado
              {sortedArchived.length !== 1 ? "s" : ""}
            </span>
          </summary>
          <div className="mt-2 opacity-60">
            <StackedLoans items={sortedArchived} />
          </div>
        </details>
      )}
    </div>
  );
}

function StackedLoans({ items }: { items: LoanItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Link
          key={it.loan.id}
          href={`/prestamos/${it.loan.id}`}
          className="block transition-transform duration-150 active:scale-[0.99]"
        >
          <LoanSummaryCard
            bank={it.loan.bank}
            description={it.loan.description}
            color={it.loan.color}
            currency={it.loan.currency}
            issueDate={it.loan.issue_date}
            pending={it.pendingAmount}
            paid={it.paidAmount}
            total={Number(it.loan.total_amount)}
            paidCount={it.paidCount}
            totalCount={it.totalCount}
            overdueCount={it.overdueCount}
          />
        </Link>
      ))}
    </div>
  );
}
