"use client";

import { useState, useTransition } from "react";
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
import { ExpenseItem } from "./expense-item";
import { deleteExpenses } from "@/actions/expenses";
import { cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

export interface SelectableExpenseItem {
  expense: ExpenseWithCategory;
  installmentIndex?: number;
  editHref?: string;
}

interface SelectableExpenseListProps {
  items: SelectableExpenseItem[];
  cardId: string;
}

/**
 * Lista de consumos con modo "selección múltiple": un toggle activa los
 * checkboxes en cada fila para elegir varios y eliminarlos de una sola vez.
 * Fuera del modo selección, cada fila conserva su comportamiento normal
 * (tap → detalle, mantener apretado → menú).
 */
export function SelectableExpenseList({ items, cardId }: SelectableExpenseListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allIds = items.map((i) => i.expense.id);
  const allSelected = selected.size === items.length && items.length > 0;

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

  return (
    <div className="space-y-2">
      {/* Toolbar de selección */}
      <div className="flex min-h-[28px] items-center justify-between px-0.5">
        {mode ? (
          <>
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
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMode(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors active:text-foreground"
          >
            <ListChecks className="h-4 w-4" />
            Seleccionar
          </button>
        )}
      </div>

      {/* Lista */}
      <div className={cn("space-y-2", isPending && "pointer-events-none opacity-50")}>
        {items.map(({ expense, installmentIndex, editHref }) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            installmentIndex={installmentIndex}
            cardId={cardId}
            editHref={editHref}
            selectionMode={mode}
            selected={selected.has(expense.id)}
            onSelectToggle={toggle}
          />
        ))}
      </div>

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
