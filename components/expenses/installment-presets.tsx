"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PRESETS = [1, 3, 6, 12] as const;

interface InstallmentPresetsProps {
  value: number;
  onChange: (n: number) => void;
  invalid?: boolean;
  /**
   * sm = formato de los formularios de alta: sin relleno y con la palabra
   * "cuotas" en cada botón, así el grupo se entiende sin un título arriba.
   */
  size?: "default" | "sm";
}

export function InstallmentPresets({
  value,
  onChange,
  invalid,
  size = "default",
}: InstallmentPresetsProps) {
  const sm = size === "sm";
  const shape = sm ? "h-9 rounded-lg px-1 text-xs whitespace-nowrap" : "h-9 rounded-lg px-2 text-sm";
  const idle = cn(
    "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
    sm ? "bg-transparent" : "bg-card"
  );
  const isPreset = PRESETS.includes(value as (typeof PRESETS)[number]);
  const [otherActive, setOtherActive] = React.useState(!isPreset && value > 1);

  const [draft, setDraft] = React.useState<string>(() =>
    value > 0 ? String(value) : ""
  );

  function handleDraftChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    setDraft(digits);
    if (digits === "") return;
    const n = Math.max(1, Math.min(120, parseInt(digits, 10)));
    onChange(n);
  }

  function handleBlur() {
    const digits = draft.replace(/\D/g, "");
    const n =
      digits === ""
        ? value >= 1 ? value : 1
        : Math.max(1, Math.min(120, parseInt(digits, 10)));
    setDraft(String(n));
    onChange(n);
  }

  return (
    <div
      className={cn(
        "grid gap-1.5",
        sm ? "grid-cols-[repeat(4,minmax(0,1fr))_3rem]" : "grid-cols-5"
      )}
    >
      {PRESETS.map((n) => {
        const active = !otherActive && value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => { setOtherActive(false); onChange(n); }}
            className={cn(
              "w-full border font-semibold tabular-nums transition-all",
              shape,
              active ? "border-primary bg-primary/10 text-primary shadow-sm" : idle,
              invalid && !active && "border-destructive/50"
            )}
          >
            {sm ? `${n} ${n === 1 ? "cuota" : "cuotas"}` : n}
          </button>
        );
      })}
      {otherActive ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          aria-label="Cantidad de cuotas"
          className={cn(
            "w-full border bg-primary/10 text-center font-semibold tabular-nums text-primary outline-none",
            shape,
            invalid ? "border-destructive" : "border-primary shadow-sm"
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setOtherActive(true);
            setDraft(value > 0 && !PRESETS.includes(value as (typeof PRESETS)[number]) ? String(value) : "");
          }}
          aria-label="Otra cantidad de cuotas"
          className={cn("w-full border font-semibold transition-all", shape, idle)}
        >
          +
        </button>
      )}
    </div>
  );
}
