"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ListChecks } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Money } from "@/components/shared/money";
import { ExpenseItem } from "./expense-item";
import { deleteExpenses } from "@/actions/expenses";
import { cn, formatDate, capitalize } from "@/lib/utils";
import { toArs } from "@/lib/periods/calculate";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

export interface SelectableExpenseItem {
  expense: ExpenseWithCategory;
  installmentIndex?: number;
  editHref?: string;
  /** Tarjeta de este consumo (para Movimientos global, donde hay varias) */
  cardId?: string;
  /** Nombre de la tarjeta a mostrar en la fila (Movimientos global) */
  cardName?: string;
}

interface SelectableExpenseListProps {
  items: SelectableExpenseItem[];
  /** Tarjeta de contexto (detalle de tarjeta). Opcional en Movimientos global. */
  cardId?: string;
  /** Agrupa los consumos por mes con su subtotal (Movimientos global). */
  groupByMonth?: boolean;
  /**
   * Contenido a renderizar entre la toolbar de selección y la lista
   * (p. ej. el buscador + filtros del detalle de tarjeta).
   */
  afterToolbar?: ReactNode;
  /** Qué mostrar cuando no hay items (tras filtrar). Por defecto no muestra nada. */
  emptyState?: ReactNode;
  /**
   * Botones de acción (p. ej. Fijo / Gastos / Agregar) que se muestran en la
   * misma fila que "Seleccionar" cuando NO se está en modo selección.
   */
  actions?: ReactNode;
}

/**
 * Lista de consumos con modo "selección múltiple": un toggle activa los
 * checkboxes en cada fila para elegir varios y eliminarlos de una sola vez.
 * Fuera del modo selección, cada fila conserva su comportamiento normal
 * (tap → detalle, mantener apretado → menú). Opcionalmente agrupa por mes.
 */
export function SelectableExpenseList({
  items,
  cardId,
  groupByMonth = false,
  afterToolbar,
  emptyState,
  actions,
}: SelectableExpenseListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allIds = items.map((i) => i.expense.id);
  const allSelected = selected.size === items.length && items.length > 0;

  // Agrupado por mes (preserva el orden de llegada de los items).
  const groups = useMemo(() => {
    if (!groupByMonth) return null;
    const map = new Map<string, SelectableExpenseItem[]>();
    for (const it of items) {
      const key = it.expense.expense_date.slice(0, 7); // YYYY-MM
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()].map(([month, list]) => ({
      month,
      label: capitalize(formatDate(month + "-01T00:00:00", "MMMM yyyy")),
      total: list.reduce((s, x) => s + toArs(x.expense, x.expense.installment_amount), 0),
      items: list,
    }));
  }, [items, groupByMonth]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exit() {
    setMode(false);
    setSelected(new Set());
  }

  function handleDelete() {
    const ids = [...selected];
    startTransition(async () => {
      const result = await deleteExpenses(ids, cardId);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(
          `${ids.length} consumo${ids.length === 1 ? "" : "s"} eliminado${ids.length === 1 ? "" : "s"}`
        );
        exit();
        router.refresh();
      }
      setConfirmOpen(false);
    });
  }

  function renderRow(it: SelectableExpenseItem) {
    return (
      <ExpenseItem
        key={it.expense.id}
        expense={it.expense}
        installmentIndex={it.installmentIndex}
        cardId={it.cardId ?? cardId}
        cardName={it.cardName}
        editHref={it.editHref}
        selectionMode={mode}
        selected={selected.has(it.expense.id)}
        onSelectToggle={toggle}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: acciones + selección en una sola fila */}
      <div className="flex min-h-[28px] items-center px-0.5">
        {mode ? (
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={exit}
              className="text-[13px] font-medium text-muted-foreground transition-colors active:text-foreground"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(allIds))
                }
                className="text-[13px] font-medium text-primary transition-opacity active:opacity-70"
              >
                {allSelected ? "Ninguno" : "Todos"}
              </button>
              <button
                type="button"
                disabled={selected.size === 0 || isPending}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-[13px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar{selected.size > 0 ? ` (${selected.size})` : ""}
              </button>
            </div>
          </div>
        ) : (
          <div className="-mx-0.5 flex w-full items-center gap-2 overflow-x-auto px-0.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setMode(true)}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors active:text-foreground"
              >
                <ListChecks className="h-4 w-4" />
                Seleccionar
              </button>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Buscador / filtros entre la toolbar y la lista (opcional) */}
      {afterToolbar}

      {/* Lista */}
      {items.length === 0 ? (
        emptyState
      ) : (
      <div className={cn(isPending && "pointer-events-none opacity-50")}>
        {groups ? (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.month}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {g.label}
                  </h2>
                  <Money
                    amount={g.total}
                    className="text-[13px] font-semibold tabular-nums text-foreground"
                  />
                </div>
                <div className="space-y-2">{g.items.map(renderRow)}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{items.map(renderRow)}</div>
        )}
      </div>
      )}

      {/* Confirmación de borrado en lote */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {selected.size} consumo{selected.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
