"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TOGGLES = [
  { key: "exterior", label: "Compras en el exterior", desc: "Permitir compras fuera del país" },
  { key: "internet", label: "Compras por internet",   desc: "Permitir compras en sitios web" },
  { key: "nfc",      label: "Pagos sin contacto",     desc: "Permitir pagos con NFC" },
] as const;

interface CardSettingsTogglesProps {
  cardId: string;
}

export function CardSettingsToggles({ cardId }: CardSettingsTogglesProps) {
  const [state, setState] = useState<Record<string, boolean>>({
    exterior: true,
    internet: true,
    nfc: true,
  });

  const storageKey = `cardPrefs:${cardId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setState(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  function toggle(key: string) {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-card">
      {TOGGLES.map((t, i) => (
        <div
          key={t.key}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
          style={{ borderBottom: i < TOGGLES.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">{t.label}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t.desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state[t.key]}
            onClick={() => toggle(t.key)}
            className={cn(
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
              state[t.key] ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200",
                state[t.key] ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
