"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { updateInstallmentAmount, updateAllInstallmentAmounts } from "@/actions/expenses";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AmountInput } from "./amount-input";

interface InstallmentAmountEditorProps {
  expenseId: string;
  cardId: string;
  /** Índice 0-based de la cuota que se está viendo */
  installmentIndex: number;
  /** Total de cuotas del consumo */
  totalInstallments: number;
  /** Monto actual de esta cuota */
  currentAmount: number;
  /** Descripción del consumo, para mostrar contexto */
  description: string;
}

export function InstallmentAmountEditor({
  expenseId,
  cardId,
  installmentIndex,
  totalInstallments,
  currentAmount,
  description,
}: InstallmentAmountEditorProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | undefined>(currentAmount);
  const [step, setStep] = useState<"input" | "choice">("input");
  const [isPending, startTransition] = useTransition();

  const newAmount = amount ?? NaN;
  const amountChanged = !isNaN(newAmount) && newAmount !== currentAmount && newAmount > 0;

  function handleOpenChange(next: boolean) {
    if (!next && amountChanged) {
      if (!window.confirm("Cambiaste el importe y no lo guardaste. ¿Querés cerrar igual?")) {
        return;
      }
    }
    if (!next) {
      setAmount(currentAmount);
      setStep("input");
    }
    setOpen(next);
  }

  function handleContinue() {
    if (!amountChanged) return;
    if (totalInstallments === 1) {
      // Una sola cuota → guardar directo sin preguntar
      saveAll();
    } else {
      setStep("choice");
    }
  }

  function saveOnlyThis() {
    startTransition(async () => {
      const result = await updateInstallmentAmount(expenseId, installmentIndex, newAmount, cardId);
      if (result.success) {
        toast.success(`Cuota ${installmentIndex + 1}/${totalInstallments} actualizada`);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function saveAll() {
    startTransition(async () => {
      const result = await updateAllInstallmentAmounts(expenseId, newAmount, cardId);
      if (result.success) {
        toast.success(
          totalInstallments === 1
            ? "Importe actualizado"
            : `Todas las ${totalInstallments} cuotas actualizadas`
        );
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
        title="Editar importe de cuota"
      >
        <Pencil className="h-3 w-3" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {totalInstallments > 1
                ? `Editar cuota ${installmentIndex + 1}/${totalInstallments}`
                : "Editar importe"}
            </DialogTitle>
            <DialogDescription className="truncate">
              {description}
            </DialogDescription>
          </DialogHeader>

          {step === "input" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cuota-amount">
                  Importe{totalInstallments > 1 ? " de la cuota" : ""}
                </Label>
                <AmountInput
                  id="cuota-amount"
                  value={amount}
                  onChange={setAmount}
                  autoFocus
                />
                {!amountChanged && (amount ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Actual: {formatCurrency(currentAmount)}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleContinue}
                disabled={!amountChanged || isPending}
              >
                Continuar
              </Button>
            </div>
          )}

          {step === "choice" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cambiás de{" "}
                <span className="font-medium text-foreground line-through">
                  {formatCurrency(currentAmount)}
                </span>{" "}
                a{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(newAmount)}
                </span>
                . ¿A qué cuotas aplicás el cambio?
              </p>

              <Button
                className="w-full"
                onClick={saveOnlyThis}
                disabled={isPending}
              >
                {isPending ? "Guardando..." : `Solo cuota ${installmentIndex + 1}/${totalInstallments}`}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={saveAll}
                disabled={isPending}
              >
                {isPending ? "Guardando..." : `Todas las cuotas (${totalInstallments})`}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setStep("input")}
                disabled={isPending}
              >
                Volver
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
