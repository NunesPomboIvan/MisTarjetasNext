"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PRESETS = [1, 3, 6, 12] as const;

interface InstallmentPresetsProps {
  value: number;
  onChange: (n: number) => void;
  invalid?: boolean;
}

export function InstallmentPresets({ value, onChange, invalid }: InstallmentPresetsProps) {
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
    <div className="grid grid-cols-5 gap-1.5">
      {PRESETS.map((n) => {
        const active = !otherActive && value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => { setOtherActive(false); onChange(n); }}
            className={cn(
              "h-9 w-full rounded-lg border px-2 text-sm font-semibold tabular-nums transition-all",
              active
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              invalid && !active && "border-destructive/50"
            )}
          >
            {n}
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
          className={cn(
            "h-9 w-full rounded-lg border bg-primary/10 px-2 text-center text-sm font-semibold tabular-nums text-primary outline-none",
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
          className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          +
        </button>
      )}
    </div>
  );
}
