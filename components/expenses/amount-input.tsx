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
    onChange(next === "" ? undefined : parsed);
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
          size === "lg" && "h-12 text-lg font-semibold",
          invalid && "border-destructive"
        )}
      />
    </div>
  );
}
