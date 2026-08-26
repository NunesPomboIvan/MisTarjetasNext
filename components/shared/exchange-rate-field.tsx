"use client";

import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/expenses/amount-input";
import { cn, formatCurrency } from "@/lib/utils";

interface ExchangeRateFieldProps {
  /** TC actual (ARS por 1 USD). null = vacío */
  value: number | null;
  onChange: (value: number | null) => void;
  /** id del input (para el htmlFor del label). Default: "exchange-rate" */
  id?: string;
  /** Monto en USD para mostrar el equivalente en pesos. null = sin hint de equivalencia */
  equivalentBase?: number | null;
  /** Marca el campo en rojo */
  invalid?: boolean;
  /** Marca el label como obligatorio (asterisco) */
  required?: boolean;
  /** Mensaje de error mostrado bajo el campo (reemplaza el hint) */
  errorMessage?: string;
  /** Texto de ayuda cuando no hay equivalencia ni error */
  hint?: string;
  /**
   * Toggle "sigue al general / fijo" (sólo préstamos). Se muestra únicamente si
   * se pasa `onFollowsGlobalChange`. Los consumos no lo usan acá: el seguimiento
   * del TC general se maneja en el detalle (ExchangeRateOverride).
   */
  globalRate?: number | null;
  followsGlobal?: boolean;
  onFollowsGlobalChange?: (follows: boolean) => void;
}

/**
 * Campo de tipo de cambio reutilizable. Usa AmountInput por debajo, así que
 * acepta la coma decimal igual que el resto de los montos de la app.
 *
 * Se usa en el alta y edición de consumos (`new-expense-hero`, `expense-form`)
 * y en el alta de préstamos (`loan-form`, con el toggle general/fijo).
 */
export function ExchangeRateField({
  value,
  onChange,
  id = "exchange-rate",
  equivalentBase = null,
  invalid,
  required,
  errorMessage,
  hint,
  globalRate = null,
  followsGlobal = false,
  onFollowsGlobalChange,
}: ExchangeRateFieldProps) {
  const showToggle = typeof onFollowsGlobalChange === "function";
  const effectiveRate = showToggle && followsGlobal ? globalRate : value;

  const defaultHint = showToggle
    ? followsGlobal
      ? "Se actualiza solo cuando cambiés el TC general (Cuenta → Tipo de cambio)."
      : globalRate == null
        ? "Configurá el TC general en Cuenta → Tipo de cambio para poder sincronizar este préstamo más adelante."
        : "Este préstamo queda fijo: los cambios del TC general no lo van a afectar."
    : "Se usa para sumar el consumo en pesos en los totales.";

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} required={required}>Tipo de cambio (ARS por 1 USD)</Label>
        {showToggle && globalRate != null && (
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => onFollowsGlobalChange!(true)}
              className={cn(
                "rounded-md px-2 py-1 transition-colors",
                followsGlobal
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sigue al general
            </button>
            <button
              type="button"
              onClick={() => onFollowsGlobalChange!(false)}
              className={cn(
                "rounded-md px-2 py-1 transition-colors",
                !followsGlobal
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Fijo
            </button>
          </div>
        )}
      </div>

      {showToggle && followsGlobal && globalRate != null ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="text-[14px] font-semibold tabular-nums text-foreground">
            {formatCurrency(globalRate)}
          </span>
          <span className="text-[11px] text-muted-foreground">TC general</span>
        </div>
      ) : (
        <AmountInput
          id={id}
          value={value}
          onChange={(v) => onChange(v ?? null)}
          prefix="$"
          placeholder="1.187,50"
          invalid={invalid}
        />
      )}

      {errorMessage ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : equivalentBase && effectiveRate ? (
        <p className="text-xs text-muted-foreground">
          Equivale a{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(equivalentBase * effectiveRate)}
          </span>{" "}
          en pesos
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint ?? defaultHint}</p>
      )}
    </div>
  );
}
