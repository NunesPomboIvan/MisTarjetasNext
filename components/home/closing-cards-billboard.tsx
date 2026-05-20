"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

export interface ClosingCardItem {
  cardId: string;
  cardName: string;
  cardColor: string;
  closeLabel: string;
  daysUntilClose: number;
}

interface ClosingCardsBillboardProps {
  items: ClosingCardItem[];
  /** Milisegundos entre rotaciones */
  intervalMs?: number;
}

/**
 * Cartelera estilo "publicidad rotativa" para mostrar tarjetas que están por
 * cerrar. Si hay una sola, se muestra fija. Si hay varias, rotan con un efecto
 * vertical de abajo hacia arriba (como cartelera digital).
 */
export function ClosingCardsBillboard({
  items,
  intervalMs = 3200,
}: ClosingCardsBillboardProps) {
  const [index, setIndex] = React.useState(0);
  const itemsLen = items.length;

  React.useEffect(() => {
    if (itemsLen <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % itemsLen);
    }, intervalMs);
    return () => clearInterval(id);
  }, [itemsLen, intervalMs]);

  React.useEffect(() => {
    if (index >= itemsLen) setIndex(0);
  }, [itemsLen, index]);

  if (itemsLen === 0) return null;

  const current = items[index];
  const urgent = current.daysUntilClose <= 1;
  const accent = current.cardColor || "#6366f1";

  return (
    <Link
      href={`/cards/${current.cardId}`}
      className="relative block overflow-hidden rounded-[20px] border border-border bg-card p-4 shadow-sm transition-transform active:scale-[0.985]"
      style={{ minHeight: 96 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          <CalendarClock className="h-5 w-5" />
        </div>

        <div className="relative flex-1 min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cierra pronto
          </p>

          {/* Contenedor con rotación vertical: cada item ocupa la misma altura
              y los animamos con translateY para crear el efecto de cartelera. */}
          <div
            className="relative mt-1 overflow-hidden"
            style={{ height: 38 }}
          >
            <div
              className="absolute inset-0 will-change-transform"
              style={{
                transform: `translateY(-${index * 38}px)`,
                transition: "transform 0.55s cubic-bezier(0.65,0,0.35,1)",
              }}
            >
              {items.map((it) => (
                <div
                  key={it.cardId + it.closeLabel}
                  className="flex h-[38px] flex-col justify-center"
                >
                  <p className="truncate text-[14.5px] font-semibold leading-tight text-foreground">
                    {it.cardName}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground tabular-nums">
                    Cierra el {it.closeLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div
            className="overflow-hidden"
            style={{ height: 38 }}
          >
            <div
              className="will-change-transform"
              style={{
                transform: `translateY(-${index * 38}px)`,
                transition: "transform 0.55s cubic-bezier(0.65,0,0.35,1)",
              }}
            >
              {items.map((it) => {
                const isUrgent = it.daysUntilClose <= 1;
                return (
                  <div
                    key={it.cardId + "-days"}
                    className="flex h-[38px] flex-col items-end justify-center"
                  >
                    <p
                      className={
                        "text-[20px] font-display font-bold leading-none tabular-nums " +
                        (isUrgent ? "text-destructive" : "text-foreground")
                      }
                    >
                      {it.daysUntilClose <= 0 ? "Hoy" : it.daysUntilClose}
                    </p>
                    {it.daysUntilClose > 0 && (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {it.daysUntilClose === 1 ? "día" : "días"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {urgent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5"
          style={{ background: "var(--destructive)" }}
        />
      )}
    </Link>
  );
}
