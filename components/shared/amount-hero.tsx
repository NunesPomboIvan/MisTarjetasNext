"use client";

import * as React from "react";

import { cn, formatAmountInput, unformatAmount } from "@/lib/utils";

interface AmountHeroProps {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  currency: "ARS" | "USD";
  onCurrencyChange: (c: "ARS" | "USD") => void;
  invalid?: boolean;
  errorMessage?: string;
  /** Muestra el importe sin permitir editarlo (ej: total de cuotas manuales). */
  readOnly?: boolean;
  /** Contenido extra debajo del importe (devolución, tipo de cambio…). */
  children?: React.ReactNode;
}

/**
 * Bloque de importe de las pantallas de alta (Consumo y Préstamo): selector de
 * moneda + importe grande centrado. Es el elemento principal del formulario;
 * sin título arriba — el placeholder "0" y el prefijo de moneda alcanzan.
 */
export function AmountHero({
  value,
  onChange,
  currency,
  onCurrencyChange,
  invalid,
  errorMessage,
  readOnly,
  children,
}: AmountHeroProps) {
  return (
    <div className="relative -mx-4 px-4 pt-2 pb-5 text-center">
      <div className="flex justify-center">
        <CurrencyToggle value={currency} onChange={onCurrencyChange} />
      </div>
      <HeroAmountInput
        value={value}
        onChange={onChange}
        invalid={invalid}
        readOnly={readOnly}
        prefix={currency === "USD" ? "US$" : "$"}
      />
      {errorMessage && <p className="mt-1 text-xs text-destructive">{errorMessage}</p>}
      {children}
    </div>
  );
}

interface HeroAmountInputProps {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  invalid?: boolean;
  readOnly?: boolean;
  prefix?: string;
}

function HeroAmountInput({ value, onChange, invalid, readOnly, prefix = "$" }: HeroAmountInputProps) {
  const [display, setDisplay] = React.useState<string>(() =>
    value == null || value === 0
      ? ""
      : formatAmountInput(String(value).replace(".", ","))
  );

  // Sync con cambios externos (ej: reset). En modo sólo lectura (o al entrar /
  // salir de él) el valor externo manda siempre, incluso vacío.
  const [prev, setPrev] = React.useState({ value, readOnly });
  if (value !== prev.value || readOnly !== prev.readOnly) {
    setPrev({ value, readOnly });
    const parsed = unformatAmount(display);
    if (value == null) {
      if (readOnly || readOnly !== prev.readOnly) setDisplay("");
    } else if (Math.abs(parsed - value) > 0.001) {
      setDisplay(
        value === 0 ? "" : formatAmountInput(value.toFixed(2).replace(".", ","))
      );
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // When the display contains thousands-separator dots (e.g. "1.256"), the browser
    // includes them in e.target.value (e.g. "1.2565" after typing "5"). A single dot
    // would be misread as a decimal separator. Strip our formatting dots first.
    const commaIdx = raw.indexOf(",");
    let cleaned: string;
    if (commaIdx >= 0) {
      // Decimal comma present → all dots before it are thousands seps
      cleaned = raw.slice(0, commaIdx).replace(/\./g, "") + raw.slice(commaIdx);
    } else {
      const dotCount = (raw.match(/\./g) ?? []).length;
      if (dotCount > 1) {
        // Multiple dots → all thousands seps
        cleaned = raw.replace(/\./g, "");
      } else if (dotCount === 1 && display.includes(".")) {
        // Single dot and we already had a thousands dot → strip it
        cleaned = raw.replace(/\./g, "");
      } else {
        // No dot, or user just typed a decimal dot → pass through (formatAmountInput handles it)
        cleaned = raw;
      }
    }
    const next = formatAmountInput(cleaned);
    setDisplay(next);
    const parsed = unformatAmount(next);
    onChange(next === "" || next === "-" ? undefined : parsed);
  }

  const len = display.length || 1;
  const fontSize =
    len <= 5  ? 40 :
    len <= 9  ? 32 :
    len <= 12 ? 26 :
    len <= 15 ? 22 : 18;

  return (
    <div className="relative mt-1 flex min-h-[3.25rem] items-center justify-center px-8">
      <span
        className={cn(
          "absolute left-6 top-1/2 -translate-y-1/2 select-none font-bold",
          invalid ? "text-destructive" : "text-muted-foreground"
        )}
        style={{ fontSize: 16 }}
      >
        {prefix}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={!readOnly}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        placeholder="0"
        value={display}
        onChange={handleChange}
        aria-label="Importe"
        aria-invalid={invalid}
        className={cn(
          "w-full bg-transparent text-center font-bold leading-tight tracking-tight tabular-nums outline-none placeholder:text-foreground/25",
          invalid ? "text-destructive" : "text-foreground",
          readOnly && "pointer-events-none"
        )}
        style={{ fontSize } as React.CSSProperties}
      />
    </div>
  );
}

/** Selector compacto de moneda: Pesos (ARS) / Dólares (USD) */
function CurrencyToggle({
  value,
  onChange,
}: {
  value: "ARS" | "USD";
  onChange: (v: "ARS" | "USD") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-[11px] font-bold">
      {(["ARS", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "rounded-md px-2 py-0.5 transition-colors",
            value === c
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {c === "ARS" ? "$" : "US$"}
        </button>
      ))}
    </div>
  );
}
