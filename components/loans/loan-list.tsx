"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
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

  const sortedActive = sortItems(active, sort);
  const sortedArchived = sortItems(archived, sort);

  return (
    <div className="space-y-5">
      {/* Selector de orden — se recuerda la última elección. Pegado a la
          derecha, cerca del botón "Nuevo" del header de arriba (margen
          negativo para acercarlo, ya que el gap con el header lo separaba
          demasiado). */}
      <div className="-mt-2 flex items-center justify-end">
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

      {sortedActive.length > 0 && <StackedLoans items={sortedActive} />}

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
