"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodByOffset } from "@/lib/periods/calculate";
import type { CardForPeriod, Period } from "@/lib/periods/calculate";

interface PeriodNavigatorProps {
  card: CardForPeriod;
  /** Período que se está viendo (para el enlace "Ir al actual"). */
  currentPeriod: Period;
  /** Color de acento de la barra (color de la tarjeta). */
  color?: string;
  /** Frase de estado: "Faltan 2 días para el cierre." */
  statusText: string;
  /** Posición del nodo "Vencimiento" en la barra (0–100). */
  duePct: number;
  /** Avance de "hoy" sobre la barra (0–100). */
  progressPct: number;
  /** Fechas pre-formateadas en el servidor ("06/08"). */
  closeLabel: string;
  dueLabel: string;
  nextCloseLabel: string;
  closeReached: boolean;
  dueReached: boolean;
  nextCloseReached: boolean;
}

/**
 * Card de estado del período: frase de cuenta regresiva + línea de tiempo
 * cierre → vencimiento → próximo cierre, con el avance de hoy. Las flechas
 * laterales navegan entre períodos (cambia el offset en la URL).
 */
export function PeriodNavigator({
  card,
  currentPeriod,
  color = "var(--primary)",
  statusText,
  duePct,
  progressPct,
  closeLabel,
  dueLabel,
  nextCloseLabel,
  closeReached,
  dueReached,
  nextCloseReached,
}: PeriodNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const offset = parseInt(searchParams.get("offset") ?? "0");

  function navigate(newOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset === 0) {
      params.delete("offset");
    } else {
      params.set("offset", newOffset.toString());
    }
    // `replace` (no `push`): moverse entre períodos es cambio de estado, no
    // navegación. Así el botón "volver" regresa al origen real y no va saltando
    // período por período.
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const isCurrentMonth = currentPeriod.status === "current" && offset === 0;
  const previousPeriod = getPeriodByOffset(card, offset - 1);
  const nextPeriod = getPeriodByOffset(card, offset + 1);

  const nodes = [
    { key: "close", label: "Cierre", date: closeLabel, reached: closeReached, pct: 0, align: "start" as const },
    { key: "due", label: "Vencimiento", date: dueLabel, reached: dueReached, pct: duePct, align: "center" as const },
    { key: "next", label: "Próx. cierre", date: nextCloseLabel, reached: nextCloseReached, pct: 100, align: "end" as const },
  ];

  function anchorStyle(pct: number, align: "start" | "center" | "end") {
    if (align === "start") return { left: 0 as const };
    if (align === "end") return { right: 0 as const };
    return { left: `${pct}%`, transform: "translateX(-50%)" };
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-4">
      {/* Estado + flechas de navegación */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate(offset - 1)}
          aria-label={`Ir a ${previousPeriod.label}`}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="flex-1 text-center text-[14px] font-semibold text-foreground">
          {statusText}
        </p>
        <button
          type="button"
          onClick={() => navigate(offset + 1)}
          aria-label={`Ir a ${nextPeriod.label}`}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Línea de tiempo */}
      <div className="mt-4 px-3">
        {/* Etiquetas */}
        <div className="relative h-4">
          {nodes.map((n) => (
            <span
              key={n.key}
              className={cn(
                "absolute top-0 whitespace-nowrap text-[12px] font-semibold tracking-[0.01em]",
                n.reached ? "text-foreground" : "text-muted-foreground"
              )}
              style={anchorStyle(n.pct, n.align)}
            >
              {n.label}
            </span>
          ))}
        </div>

        {/* Riel */}
        <div className="relative mt-2 h-3">
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-border" />
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-500"
            style={{ width: `${progressPct}%`, background: color }}
          />
          {nodes.map((n) => (
            <span
              key={n.key}
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: `${n.pct}%`,
                borderColor: n.reached ? color : "var(--border)",
                background: n.reached ? color : "var(--card)",
              }}
            />
          ))}
          {progressPct > 0 && progressPct < 100 && (
            <span
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
              style={{ left: `${progressPct}%`, background: color }}
            />
          )}
        </div>

        {/* Fechas */}
        <div className="relative mt-2 h-4">
          {nodes.map((n) => (
            <span
              key={n.key}
              className={cn(
                "absolute top-0 whitespace-nowrap text-[13px] font-bold tabular-nums",
                n.reached ? "text-foreground" : "text-muted-foreground"
              )}
              style={anchorStyle(n.pct, n.align)}
            >
              {n.date}
            </span>
          ))}
        </div>
      </div>

      {!isCurrentMonth && (
        <div className="mt-3 text-center">
          <button
            onClick={() => navigate(0)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ir al actual
          </button>
        </div>
      )}
    </div>
  );
}
