"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PRESETS = [1, 3, 6, 12, 18, 24] as const;

interface InstallmentPresetsProps {
  value: number;
  onChange: (n: number) => void;
  invalid?: boolean;
}

/**
 * Selector rápido de cuotas con presets + opción "Otro" que abre input numérico.
 */
export function InstallmentPresets({ value, onChange, invalid }: InstallmentPresetsProps) {
  const isPreset = PRESETS.includes(value as (typeof PRESETS)[number]);
  // Trackeamos sólo la intención del usuario de "estar en modo Otro";
  // si el value coincide con un preset, no mostramos el input numérico.
  const [otherIntent, setOtherIntent] = React.useState(!isPreset && value > 1);
  const otherActive = otherIntent && !isPreset;

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
                setOtherIntent(false);
                onChange(n);
              }}
              className={cn(
                "h-9 min-w-[2.5rem] rounded-xl border px-2.5 text-sm font-medium transition-all tabular-nums",
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
            setOtherIntent(true);
            // Si activamos "otro" y el valor actual es preset, dejamos un placeholder neutro
            if (PRESETS.includes(value as (typeof PRESETS)[number])) {
              onChange(2);
            }
          }}
          className={cn(
            "h-9 rounded-xl border px-3 text-sm font-medium transition-all",
            otherActive
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          Otro…
        </button>
      </div>

      {otherActive && (
        <Input
          type="number"
          min={1}
          max={120}
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(Math.max(1, Math.min(120, n)));
          }}
          className={cn("max-w-[8rem]", invalid && "border-destructive")}
          placeholder="N° cuotas"
          autoFocus
        />
      )}
    </div>
  );
}
