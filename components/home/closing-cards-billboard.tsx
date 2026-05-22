"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";

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
  /** Muestra el rótulo interno "Cierra pronto" (ocultar si ya hay encabezado) */
  showLabel?: boolean;
}

const ROW_H = 30;

/**
 * Tira "cartelera" — pensada para vivir como pie de la card de saldo en el
 * homepage. Si hay una sola tarjeta cerrando, queda fija; si hay varias rotan
 * con efecto vertical (de abajo hacia arriba).
 */
export function ClosingCardsBillboard({
  items,
  intervalMs = 3200,
  showLabel = true,
}: ClosingCardsBillboardProps) {
  const router = useRouter();
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
  const accent = current.cardColor || "#6366f1";

  return (
    <button
      type="button"
      onClick={() => router.push("/cierres")}
      className="group flex w-full items-center gap-3 text-left transition-colors"
      aria-label="Ver cierres de todas las tarjetas"
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}20`, color: accent }}
      >
        <CalendarClock className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        {showLabel && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cierra pronto
          </p>
        )}
        <div
          className="relative overflow-hidden"
          style={{ height: ROW_H }}
        >
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translateY(-${index * ROW_H}px)`,
              transition: "transform 0.55s cubic-bezier(0.65,0,0.35,1)",
            }}
          >
            {items.map((it) => (
              <div
                key={it.cardId + "-name"}
                className="flex flex-col justify-center"
                style={{ height: ROW_H }}
              >
                <p className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
                  {it.cardName}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {it.closeLabel}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex-shrink-0 overflow-hidden text-right"
        style={{ height: ROW_H }}
      >
        <div
          className="will-change-transform"
          style={{
            transform: `translateY(-${index * ROW_H}px)`,
            transition: "transform 0.55s cubic-bezier(0.65,0,0.35,1)",
          }}
        >
          {items.map((it) => {
            const isToday = it.daysUntilClose <= 0;
            const isUrgent = it.daysUntilClose <= 1;
            return (
              <div
                key={it.cardId + "-days"}
                className="flex flex-col items-end justify-center"
                style={{ height: ROW_H }}
              >
                {isToday ? (
                  <p
                    className={
                      "font-display text-[15px] font-bold leading-none " +
                      (isUrgent ? "text-destructive" : "text-foreground")
                    }
                  >
                    Hoy
                  </p>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <p
                      className={
                        "font-display text-[17px] font-bold leading-none tabular-nums " +
                        (isUrgent ? "text-destructive" : "text-foreground")
                      }
                    >
                      {it.daysUntilClose}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {it.daysUntilClose === 1 ? "día" : "días"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
    </button>
  );
}
