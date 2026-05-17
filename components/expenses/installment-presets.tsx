"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PRESETS = [1, 3, 6, 12, 18, 24] as const;

interface InstallmentPresetsProps {
  value: number;
  onChange: (n: number) => void;
  invalid?: boolean;
}

/**
 * Selector de cuotas: chips rectangulares con presets + opción "Otra" que abre
 * un campo numérico libre. El campo usa un borrador local (string) para que el
 * usuario pueda borrar y escribir cualquier número sin que quede trabado.
 */
export function InstallmentPresets({ value, onChange, invalid }: InstallmentPresetsProps) {
  const isPreset = PRESETS.includes(value as (typeof PRESETS)[number]);
  const [otherActive, setOtherActive] = React.useState(!isPreset && value > 1);

  // Borrador editable del campo libre (string → permite vaciar/editar sin trabas).
  const [draft, setDraft] = React.useState<string>(() =>
    value > 0 ? String(value) : ""
  );

  function handleDraftChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    setDraft(digits);
    if (digits === "") return; // dejamos vaciar; no propagamos hasta tener un número
    const n = Math.max(1, Math.min(120, parseInt(digits, 10)));
    onChange(n);
  }

  function handleBlur() {
    const digits = draft.replace(/\D/g, "");
    const n =
      digits === ""
        ? value >= 1
          ? value
          : 1
        : Math.max(1, Math.min(120, parseInt(digits, 10)));
    setDraft(String(n));
    onChange(n);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((n) => {
          const active = !otherActive && value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setOtherActive(false);
                onChange(n);
              }}
              className={cn(
                "h-9 min-w-[2.75rem] rounded-lg border px-3 text-sm font-semibold tabular-nums transition-all",
                active
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                invalid && !active && "border-destructive/50"
              )}
            >
              {n === 1 ? "1 pago" : `${n} cuotas`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setOtherActive(true);
            setDraft(value > 0 ? String(value) : "");
          }}
          className={cn(
            "h-9 rounded-lg border px-3 text-sm font-semibold transition-all",
            otherActive
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          Otra
        </button>
      </div>

      {otherActive && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            placeholder="Ej: 15"
            className={cn(
              "h-9 w-24 rounded-lg border bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-primary",
              invalid ? "border-destructive" : "border-border"
            )}
          />
          <span className="text-sm text-muted-foreground">cuotas</span>
        </div>
      )}
    </div>
  );
}
