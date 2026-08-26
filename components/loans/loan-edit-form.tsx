"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateLoan } from "@/actions/loans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { AmountInput } from "@/components/expenses/amount-input";
import { ColorSwatchPicker } from "@/components/shared/color-swatch-picker";
import { RequiredFieldsNote } from "@/components/shared/required-fields-note";
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
import { cn, formatCurrency } from "@/lib/utils";

const COLOR_PRESETS = [
  "#6366f1", "#f97316", "#ef4444", "#eab308",
  "#1a7a46", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface LoanEditFormProps {
  loanId: string;
  initial: {
    description: string;
    bank: string | null;
    color: string;
    issue_date: string;
    currency: "ARS" | "USD";
    exchange_rate: number | null;
  };
}

export function LoanEditForm({ loanId, initial }: LoanEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState(initial.description);
  const [bank, setBank] = useState(initial.bank ?? "");
  const [color, setColor] = useState(initial.color || "#6366f1");
  const [issueDate, setIssueDate] = useState(initial.issue_date);
  const [exchangeRate, setExchangeRate] = useState<number | null>(
    initial.exchange_rate != null ? Number(initial.exchange_rate) : null
  );
  const [confirmRateOpen, setConfirmRateOpen] = useState(false);
  // Errores por campo — mismo patrón visual que tarjeta / consumo.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isUsd = initial.currency === "USD";
  const rateChanged =
    isUsd &&
    exchangeRate != null &&
    exchangeRate !== (initial.exchange_rate != null ? Number(initial.exchange_rate) : null);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = "La descripción es requerida";
    if (isUsd && !(exchangeRate && exchangeRate > 0))
      errs.exchange_rate = "Ingresá el tipo de cambio";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    // Cambio de TC: pedir confirmación antes de recalcular todas las cuotas.
    if (rateChanged) {
      setConfirmRateOpen(true);
      return;
    }
    save();
  }

  function save() {
    startTransition(async () => {
      const result = await updateLoan(loanId, {
        description: description.trim(),
        bank: bank.trim() || null,
        color,
        issue_date: issueDate,
        exchange_rate: isUsd ? exchangeRate : null,
      });
      if (result.success) {
        toast.success(
          rateChanged
            ? "Préstamo actualizado — cuotas recalculadas con el nuevo TC"
            : "Préstamo actualizado"
        );
        router.push(`/prestamos/${loanId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bank">Banco o entidad</Label>
          <Input
            id="bank"
            placeholder="Ej: Galicia, Santander…"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" required>Descripción</Label>
          <Input
            id="description"
            placeholder="Ej: Préstamo personal auto"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearError("description");
            }}
            className={cn(errors.description && "border-destructive")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label required>Fecha de emisión</Label>
          <DatePickerField value={issueDate} onChange={setIssueDate} />
        </div>

        {/* Tipo de cambio — sólo préstamos en USD */}
        {isUsd && (
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
            <Label htmlFor="exchange_rate" required>Tipo de cambio (ARS por 1 USD)</Label>
            <AmountInput
              id="exchange_rate"
              value={exchangeRate}
              onChange={(v) => {
                setExchangeRate(v ?? null);
                clearError("exchange_rate");
              }}
              prefix="$"
              placeholder="1.187,50"
              invalid={!!errors.exchange_rate}
            />
            {errors.exchange_rate ? (
              <p className="text-xs text-destructive">{errors.exchange_rate}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {rateChanged
                  ? "Al guardar se van a recalcular todas las cuotas con el nuevo TC."
                  : "Si lo cambiás, todas las cuotas se recalculan con el nuevo valor."}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap items-center gap-2">
            <ColorSwatchPicker colors={COLOR_PRESETS} value={color} onChange={setColor} />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color personalizado"
              aria-label="Elegir color personalizado"
            />
          </div>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Para cambiar el monto o las cuotas, eliminá el préstamo y cargalo de nuevo
        (así no se pierde el estado de las cuotas ya pagadas).
      </p>

      <RequiredFieldsNote />

      <Button
        type="submit"
        className="btn-glass-primary w-full font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </>
        )}
      </Button>

      {/* Confirmación: aplicar el nuevo TC a todas las cuotas */}
      <AlertDialog open={confirmRateOpen} onOpenChange={setConfirmRateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Aplicar nuevo tipo de cambio a todas las cuotas?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todas las cuotas de este préstamo van a pasar a usar el TC{" "}
              <strong>{formatCurrency(exchangeRate ?? 0)}</strong>
              {initial.exchange_rate != null && (
                <>
                  {" "}
                  (antes {formatCurrency(Number(initial.exchange_rate))})
                </>
              )}
              . Esto recalcula su equivalente en pesos, incluso el de las cuotas
              con TC personalizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                setConfirmRateOpen(false);
                save();
              }}
            >
              Sí, aplicar a todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
