"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { deleteExpense } from "@/actions/expenses";

interface ExpenseDetailActionsProps {
  expenseId: string;
  cardId: string;
  editHref: string;
  backHref: string;
  description: string;
}

export function ExpenseDetailActions({
  expenseId,
  cardId,
  editHref,
  backHref,
  description,
}: ExpenseDetailActionsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expenseId, cardId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Gasto eliminado");
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

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar &quot;{description}&quot;. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
