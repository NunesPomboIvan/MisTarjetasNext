"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteExpense } from "@/actions/expenses";
import { formatDate, cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface ExpenseItemProps {
  expense: ExpenseWithCategory;
  onEdit?: (id: string) => void;
  /** URL directa para editar (alternativa a onEdit, usada desde Server Components) */
  editHref?: string;
  /** Índice 0-based de la cuota que cae en el período visualizado. Undefined = no mostrar */
  installmentIndex?: number;
  /** ID de la tarjeta, necesario para el editor de importe inline */
  cardId?: string;
  /** Nombre de la tarjeta, para mostrar en listas globales */
  cardName?: string;
}

export function ExpenseItem({ expense, onEdit, editHref, installmentIndex, cardId, cardName }: ExpenseItemProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cat = expense.category;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expense.id, expense.card_id);
      if (!result.success) toast.error(result.error);
      else toast.success("Consumo eliminado");
      setDeleteOpen(false);
    });
  }

  const showInstallmentBadge =
    expense.installments > 1 && installmentIndex !== undefined && installmentIndex >= 0;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-opacity",
          isPending && "opacity-40"
        )}
      >
        {/* Category emoji */}
        {cat ? (
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: cat.color_bg }}
          >
            {cat.emoji}
          </div>
        ) : (
          <div className="h-9 w-9 flex-shrink-0" />
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{expense.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {formatDate(expense.expense_date + "T00:00:00")}
            </span>

            {/* Cuota N/Total cuando se visualiza en el contexto de un período */}
            {showInstallmentBadge ? (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Cuota {installmentIndex! + 1}/{expense.installments}
              </Badge>
            ) : expense.installments > 1 ? (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {expense.installments} cuotas
              </Badge>
            ) : null}

            {cat && (
              <span
                className="rounded-full px-1.5 py-0 text-[10px] font-medium"
                style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
              >
                {cat.name}
              </span>
            )}

            {/* Tarjeta (visible solo en listas globales) */}
            {cardName && (
              <span className="text-[10px] text-muted-foreground">💳 {cardName}</span>
            )}

            {expense.tags?.map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <Money amount={expense.installment_amount} size="md" />
          {expense.installments > 1 && !showInstallmentBadge && (
            <span className="text-[10px] text-muted-foreground">c/u</span>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Opciones"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(onEdit || editHref) && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    if (editHref) window.location.href = editHref;
                    else onEdit?.(expense.id);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar consumo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar &quot;{expense.description}&quot;. Esta acción no se puede deshacer.
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
    </>
  );
}
