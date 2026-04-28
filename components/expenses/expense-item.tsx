"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, Pencil, MoreVertical, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toggleExpensePaid, deleteExpense } from "@/actions/expenses";
import { formatDate, cn } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface ExpenseItemProps {
  expense: ExpenseWithCategory;
  onEdit?: (id: string) => void;
  /** Índice 0-based de la cuota que cae en el período visualizado. Undefined = no mostrar */
  installmentIndex?: number;
  /** Nombre de la tarjeta, para mostrar en listas globales */
  cardName?: string;
}

export function ExpenseItem({ expense, onEdit, installmentIndex, cardName }: ExpenseItemProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cat = expense.category;

  function handleTogglePaid() {
    startTransition(async () => {
      const result = await toggleExpensePaid(expense.id, !expense.paid);
      if (!result.success) toast.error(result.error);
    });
  }

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
          "flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-opacity",
          expense.paid && "opacity-60",
          isPending && "opacity-40"
        )}
      >
        {/* Paid toggle */}
        <button
          onClick={handleTogglePaid}
          disabled={isPending}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors tap-target flex items-center justify-center"
          title={expense.paid ? "Marcar como no pagado" : "Marcar como pagado"}
        >
          {expense.paid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Category emoji */}
        {cat && (
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: cat.color_bg }}
          >
            {cat.emoji}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", expense.paid && "line-through")}>
            {expense.description}
          </p>
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
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(expense.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleTogglePaid}>
              <Check className="mr-2 h-4 w-4" />
              {expense.paid ? "Desmarcar pagado" : "Marcar pagado"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
