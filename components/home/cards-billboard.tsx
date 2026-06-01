"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Calendar, CalendarClock, Banknote } from "lucide-react";

const ICONS = {
  calendar: Calendar,
  "calendar-clock": CalendarClock,
  banknote: Banknote,
} as const;

export type BillboardIcon = keyof typeof ICONS;

export interface BillboardItem {
  /** Identificador único (para keys) */
  id: string;
  /** Color de acento del ícono */
  accent: string;
  /** Texto principal (ej: nombre del banco) */
  primary: string;
  /** Texto secundario opcional, render con peso normal y color muted
   *  (ej: "•••• 6426" o "· Cuota 1/5"). El llamador formatea el separador. */
  suffix?: string;
  /** Días restantes (para cerrar o vencer). <=0 = "Hoy" */
  days: number;
}

interface CardsBillboardProps {
  items: BillboardItem[];
  /** Rótulo interno (ej: "Próximos pagos") */
  label: string;
  /** Destino al tocar la cartelera */
  href: string;
  /** Ícono a mostrar a la izquierda (clave serializable, no el componente) */
  icon: BillboardIcon;
  /** Texto accesible del botón */
  ariaLabel?: string;
  /** Milisegundos entre rotaciones */
  intervalMs?: number;
  /** Muestra el rótulo interno (ocultar si ya hay encabezado) */
  showLabel?: boolean;
}

/**
 * Cartelera con rotación vertical (de abajo hacia arriba). Si hay un solo item
 * queda fija; con varios rota. Toda la tira es tocable y navega a `href`.
 */
export function CardsBillboard({
  items,
  label,
  href,
  icon,
  ariaLabel,
  intervalMs = 3200,
  showLabel = true,
}: CardsBillboardProps) {
  const Icon = ICONS[icon];
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

  if (itemsLen === 0) return null;

  // Índice acotado: si la cantidad de items cambió y `index` quedó fuera de
  // rango, lo normalizamos sin necesidad de un efecto que llame a setState.
  const active = index % itemsLen;
  const current = items[active];
  const accent = current.accent || "#6366f1";

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group flex w-full items-center gap-3 text-left transition-colors"
      aria-label={ariaLabel ?? label}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}20`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        {showLabel && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
        )}
        <div className="relative overflow-hidden">
          <div
            className="flex will-change-transform"
            style={{
              transform: `translateX(-${active * 100}%)`,
              transition: "transform 0.5s cubic-bezier(0.65,0,0.35,1)",
            }}
          >
            {items.map((it) => {
              const isToday = it.days <= 0;
              const isUrgent = it.days <= 1;
              return (
                <div
                  key={it.id}
                  className="flex w-full flex-shrink-0 items-center justify-between gap-2"
                >
                  <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-tight text-foreground">
                    {it.primary}
                    {it.suffix && (
                      <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                        {it.suffix}
                      </span>
                    )}
                  </p>
                  <div className="flex-shrink-0 text-right">
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
                      <div className="flex items-baseline justify-end gap-1">
                        <p
                          className={
                            "font-display text-[17px] font-bold leading-none tabular-nums " +
                            (isUrgent ? "text-destructive" : "text-foreground")
                          }
                        >
                          {it.days}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {it.days === 1 ? "día" : "días"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
    </button>
  );
}
