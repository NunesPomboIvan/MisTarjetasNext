"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Lock, LockOpen, X } from "lucide-react";
import {
  setExpenseRateOverride,
  clearExpenseRateOverride,
} from "@/actions/exchange";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface ExchangeRateOverrideProps {
  expenseId: string;
  /** Monto total del consumo en USD (para mostrar el equivalente) */
  amountUsd: number;
  /** TC actual del consumo */
  rate: number;
  /** true = TC personalizado (bloqueado ante cambios globales) */
  custom: boolean;
  /** TC global vigente. null = sin configurar */
  globalRate: number | null;
}

/**
 * Sección "Tipo de cambio" del detalle de un consumo en USD.
 * Muestra qué TC usa el registro (general 🔓 o personalizado 🔒) y permite
 * personalizarlo (queda bloqueado) o volver a seguir el TC general.
 */
export function ExchangeRateOverride({
  expenseId,
  amountUsd,
  rate,
  custom,
  globalRate,
}: ExchangeRateOverrideProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(rate);

  function saveOverride() {
    if (!(draft && draft > 0)) {
      toast.error("Ingresá un tipo de cambio mayor a 0");
      return;
    }
    startTransition(async () => {
      const result = await setExpenseRateOverride(expenseId, draft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tipo de cambio personalizado guardado");
      setEditing(false);
      router.refresh();
    });
  }

  function backToGlobal() {
    startTransition(async () => {
      const result = await clearExpenseRateOverride(expenseId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("El consumo vuelve a usar el tipo de cambio general");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-[18px] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {custom ? (
            <Lock className="h-4 w-4 text-amber-500" />
          ) : (
            <LockOpen className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Tipo de cambio {custom ? "personalizado" : "general"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {custom
                ? "Los cambios del TC general no afectan este consumo"
                : "Sigue el TC general: se recalcula si lo cambiás"}
            </p>
          </div>
        </div>
        <p className="flex-shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
          {formatCurrency(rate)}
        </p>
      </div>

      <p className="text-[12px] text-muted-foreground">
        ≈{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(amountUsd * rate)}
        </span>{" "}
        en pesos
      </p>

      {editing ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <Label htmlFor="override-rate">Tipo de cambio para este consumo</Label>
          <Input
            id="override-rate"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            autoFocus
            value={draft ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDraft(e.target.value === "" || isNaN(n) ? null : n);
            }}
          />
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="btn-glass-primary"
              onClick={saveOverride}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(rate);
              setEditing(true);
            }}
            disabled={isPending}
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Personalizar tipo de cambio
          </Button>
          {custom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={backToGlobal}
              disabled={isPending || globalRate == null}
              title={
                globalRate == null
                  ? "Configurá primero el TC general en Cuenta → Tipo de cambio"
                  : undefined
              }
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <LockOpen className="mr-1.5 h-3.5 w-3.5" />
              )}
              Volver a usar tipo de cambio general
              {globalRate != null && ` (${formatCurrency(globalRate)})`}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
