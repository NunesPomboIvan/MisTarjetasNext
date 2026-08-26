"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { deleteExpense, excludeExpenseInstallment } from "@/actions/expenses";

interface ExpenseDetailActionsProps {
  expenseId: string;
  cardId: string;
  editHref: string;
  backHref: string;
  description: string;
  /** true = consumo fijo mensual: permite elegir el alcance al eliminar */
  recurring?: boolean;
  /** Índice 0-based del período (mes) que se está viendo, si viene con ese contexto */
  installmentIndex?: number;
}

export function ExpenseDetailActions({
  expenseId,
  cardId,
  editHref,
  backHref,
  description,
  recurring = false,
  installmentIndex,
}: ExpenseDetailActionsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const canChooseDeleteScope =
    recurring && installmentIndex !== undefined && installmentIndex >= 0;

  function handleDeleteAll() {
    startTransition(async () => {
      const result = await deleteExpense(expenseId, cardId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(canChooseDeleteScope ? "Consumo eliminado por completo" : "Consumo eliminado");
      setOpen(false);
      router.push(backHref);
      router.refresh();
    });
  }

  function handleDeleteOnlyThis() {
    if (installmentIndex === undefined) return;
    startTransition(async () => {
      const result = await excludeExpenseInstallment(expenseId, installmentIndex, cardId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Este mes fue eliminado");
      setOpen(false);
      router.push(backHref);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Link
        href={editHref}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-10 flex-1"
        )}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Link>
      <Button
        variant="outline"
        className="h-10 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        pending={isPending}
        title="¿Eliminar consumo?"
        description={
          canChooseDeleteScope ? (
            <>
              &quot;{description}&quot; es un consumo fijo mensual. Elegí si eliminás
              solo este mes o el consumo completo (todos los meses, pasados y
              futuros). Esta acción no se puede deshacer.
            </>
          ) : (
            <>
              Vas a eliminar &quot;{description}&quot;. Esta acción no se puede
              deshacer.
            </>
          )
        }
        {...(canChooseDeleteScope
          ? {
              actions: [
                { label: "Eliminar solo este mes", onClick: handleDeleteOnlyThis },
                { label: "Eliminar todos los meses", onClick: handleDeleteAll },
              ],
            }
          : { onConfirm: handleDeleteAll })}
      />
    </div>
  );
}
