"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
import { deleteLoan } from "@/actions/loans";

interface DeleteLoanButtonProps {
  loanId: string;
  loanName?: string;
}

export function DeleteLoanButton({ loanId, loanName }: DeleteLoanButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteLoan(loanId);
      if (!res.success) {
        toast.error(res.error ?? "No se pudo eliminar el préstamo");
        return;
      }
      setOpen(false);
      toast.success("Préstamo eliminado");
      router.push("/prestamos");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Eliminar préstamo"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {loanName ?? "este préstamo"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el préstamo y todas sus cuotas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
