"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, formatAmountInput, unformatAmount } from "@/lib/utils";

interface AmountInputProps {
  /** Valor numérico controlado */
  value: number | undefined | null;
  /** Llamado con el número parseado (no con el string formateado) */
  onChange: (value: number | undefined) => void;
  /** Símbolo de moneda mostrado a la izquierda. Default: "$" */
  prefix?: string;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  autoFocus?: boolean;
  className?: string;
  /** Tamaño visual: lg = más grande para el campo principal */
  size?: "default" | "lg";
  /** Muestra un botón +/− para alternar el signo (devoluciones / reintegros) */
  signToggle?: boolean;
}

/**
 * Input de monto con formato argentino en tiempo real.
 * - Muestra "$ 1.500,00" mientras el usuario tipea
 * - Comunica el valor numérico parseado al padre
 * - Permite vacío (undefined) sin romper el formulario
 */
export function AmountInput({
  value,
  onChange,
  prefix = "$",
  placeholder = "0,00",
  invalid,
  id,
  autoFocus,
  className,
  size = "default",
  signToggle = false,
}: AmountInputProps) {
  // Mantenemos el string crudo localmente para no perder ceros decimales mientras se tipea ("100,0" → "100,00")
  const [display, setDisplay] = React.useState<string>(() =>
    value == null || value === 0 ? "" : formatAmountInput(String(value).replace(".", ","))
  );

  // Sincronización con cambios externos del valor (ej: auto-cálculo de cuota).
  // Patrón "setState during render" (React 19) en lugar de useEffect, para evitar
  // renders en cascada y cumplir react-hooks/set-state-in-effect.
  const [prevValue, setPrevValue] = React.useState<number | null | undefined>(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = unformatAmount(display);
    if (value != null && Math.abs(parsed - value) > 0.001) {
      setDisplay(value === 0 ? "" : formatAmountInput(value.toFixed(2).replace(".", ",")));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = formatAmountInput(e.target.value);
    setDisplay(next);
    const parsed = unformatAmount(next);
    onChange(next === "" || next === "-" ? undefined : parsed);
  }

  const isNegative = (value ?? 0) < 0;

  function toggleSign() {
    // Alterna el signo del valor actual. Con campo vacío, prepara un "-".
    if (value == null || value === 0) {
      setDisplay((d) => (d.startsWith("-") ? d.replace(/^-/, "") : `-${d}`));
      return;
    }
    onChange(-value);
  }

  return (
    <div className={cn("relative", className)}>
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground",
          size === "lg" ? "text-lg font-semibold" : "text-sm"
        )}
      >
        {prefix}
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className={cn(
          "pl-7 tabular-nums",
          signToggle && "pr-12",
          size === "lg" && "h-12 text-lg font-semibold",
          invalid && "border-destructive"
        )}
      />
      {signToggle && (
        <button
          type="button"
          onClick={toggleSign}
          aria-label={isNegative ? "Cambiar a positivo" : "Cambiar a negativo (devolución)"}
          title={isNegative ? "Es una devolución (negativo)" : "Marcar como devolución (negativo)"}
          className={cn(
            "absolute right-2 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-lg border text-base font-bold transition-colors",
            isNegative
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "border-border bg-muted/60 text-muted-foreground hover:text-foreground"
          )}
        >
          {isNegative ? "−" : "+"}
        </button>
      )}
    </div>
  );
}
