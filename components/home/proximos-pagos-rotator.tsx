"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Money } from "@/components/shared/money";

export interface ProximoPagoItem {
  cardId: string;
  cardName: string;
  cardColor: string;
  total: number;
  dueLabel: string;
  daysUntilDue: number;
}

interface ProximosPagosRotatorProps {
  items: ProximoPagoItem[];
  /** Milisegundos entre rotaciones */
  intervalMs?: number;
}

/**
 * Rotador tipo "cartel publicitario": muestra un pago a la vez y va alternando.
 * Pausa al hacer hover/touch para que el usuario pueda leer.
 */
export function ProximosPagosRotator({
  items,
  intervalMs = 4500,
}: ProximosPagosRotatorProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (items.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, paused, intervalMs]);

  // Si cambia la cantidad de items y el índice queda fuera, lo reseteamos
  React.useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (items.length === 0) return null;

  const current = items[index];
  const urgent = current.daysUntilDue <= 3;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <Link
        key={current.cardId + index}
        href={`/cards/${current.cardId}`}
        className="block rounded-[18px] border border-border bg-card p-4 transition-all active:scale-[0.985] hover:border-primary/40 animate-in fade-in slide-in-from-right-2 duration-300"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: `${current.cardColor}20`, color: current.cardColor }}
          >
            <Calendar className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {current.cardName}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {current.dueLabel}
            </p>
          </div>

          <div className="flex-shrink-0 text-right">
            <Money
              amount={current.total}
              className="block text-[15px] font-semibold tabular-nums text-foreground"
            />
            <p
              className={
                "mt-0.5 text-[11px] font-semibold " +
                (urgent ? "text-destructive" : "text-muted-foreground")
              }
            >
              {current.daysUntilDue <= 0
                ? "Vence hoy"
                : `Vence en ${current.daysUntilDue} día${current.daysUntilDue === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </Link>

      {/* Indicadores tipo carrusel */}
      {items.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Mostrar pago ${i + 1}`}
              onClick={() => setIndex(i)}
              className="transition-all duration-200"
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? "var(--primary)" : "var(--border)",
                opacity: i === index ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
