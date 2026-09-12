"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodByOffset } from "@/lib/periods/calculate";
import type { CardForPeriod, Period } from "@/lib/periods/calculate";
import { Money } from "@/components/shared/money";
import { CardPeriodPaidToggle } from "@/components/cards/card-period-paid-toggle";

interface PeriodNavigatorProps {
  card: CardForPeriod;
  cardId: string;
  /** Período que se está viendo (para saber si es el actual). */
  currentPeriod: Period;
  /** Frase de estado: "Cierra en 2 días". */
  statusText: string;
  /** Posición del nodo "Cierre" en la barra (0–100). */
  closePct: number;
  /** Avance de "hoy" sobre la barra (0–100). */
  progressPct: number;
  /** Fechas pre-formateadas en el servidor ("06/08"). "—" si no hay período previo. */
  lastDueLabel: string;
  closeLabel: string;
  dueLabel: string;
  lastDueReached: boolean;
  closeReached: boolean;
  dueReached: boolean;
  /** Saldo del período, límite de la tarjeta y disponible restante. */
  saldo: number;
  limite: number;
  disponible: number;
  /** Estado de pago del período. */
  paid: boolean;
  paidDate: string | null;
}

const ARROW_CLASS =
  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted";

/**
 * Card unificada del período: estado + navegación arriba, saldo/límite/
 * disponible en el medio, línea de tiempo (último vencimiento → cierre →
 * vencimiento) abajo. Todo se recalcula junto al navegar entre períodos.
 */
export function PeriodNavigator({
  card,
  cardId,
  currentPeriod,
  statusText,
  closePct,
  progressPct,
  lastDueLabel,
  closeLabel,
  dueLabel,
  lastDueReached,
  closeReached,
  dueReached,
  saldo,
  limite,
  disponible,
  paid,
  paidDate,
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

  // Si estás viendo un período pasado, el actual queda a la derecha; si estás
  // en uno futuro, a la izquierda. Esa flecha salta directo al actual.
  const jumpLeft = !isCurrentMonth && offset > 0;
  const jumpRight = !isCurrentMonth && offset < 0;

  const nodes = [
    { key: "lastDue", label: "Últ. vencimiento", date: lastDueLabel, reached: lastDueReached, pct: 0, align: "start" as const },
    { key: "close", label: "Cierre", date: closeLabel, reached: closeReached, pct: closePct, align: "center" as const },
    { key: "due", label: "Vencimiento", date: dueLabel, reached: dueReached, pct: 100, align: "end" as const },
  ];

  // Primer hito todavía pendiente: se destaca; los ya pasados van atenuados.
  const nextPendingKey = nodes.find((n) => !n.reached)?.key ?? null;

  function anchorStyle(pct: number, align: "start" | "center" | "end") {
    if (align === "start") return { left: 0 as const };
    if (align === "end") return { right: 0 as const };
    return { left: `${pct}%`, transform: "translateX(-50%)" };
  }

  const pctUsado = limite > 0 ? Math.round((saldo / limite) * 100) : null;

  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3.5">
      {/* Estado + toggle de pago (izq) / navegación (der) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {statusText}
          </p>
          <CardPeriodPaidToggle
            cardId={cardId}
            periodKey={currentPeriod.key}
            paid={paid}
            paidDate={paidDate}
          />
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          {jumpLeft ? (
            <button
              type="button"
              onClick={() => navigate(0)}
              aria-label="Ir al período actual"
              className={cn(ARROW_CLASS, "text-primary hover:text-primary")}
            >
              <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(offset - 1)}
              aria-label={`Ir a ${previousPeriod.label}`}
              className={cn(ARROW_CLASS, "text-muted-foreground hover:text-foreground")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {jumpRight ? (
            <button
              type="button"
              onClick={() => navigate(0)}
              aria-label="Ir al período actual"
              className={cn(ARROW_CLASS, "text-primary hover:text-primary")}
            >
              <ChevronsRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(offset + 1)}
              aria-label={`Ir a ${nextPeriod.label}`}
              className={cn(ARROW_CLASS, "text-muted-foreground hover:text-foreground")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Saldo actual + % usado */}
      <div className="mt-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground">Saldo actual</p>
            <Money
              amount={saldo}
              className="mt-0.5 block font-display text-[22px] font-bold leading-tight tracking-tight text-foreground tabular-nums"
            />
          </div>
          {pctUsado != null && (
            <span
              className={cn(
                "mb-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                pctUsado > 100
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground"
              )}
            >
              {pctUsado}% usado
            </span>
          )}
        </div>

        {/* Límite total + Disponible, lado a lado */}
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground">Límite total</p>
            {limite > 0 ? (
              <Money
                amount={limite}
                className="mt-0.5 block font-display text-[14px] font-bold leading-tight tracking-tight text-foreground tabular-nums"
              />
            ) : (
              <Link
                href={`/cards/${cardId}/edit`}
                className="mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Definir límite
              </Link>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground">Disponible</p>
            <Money
              amount={disponible}
              className="mt-0.5 block font-display text-[14px] font-bold leading-tight tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Separador sutil */}
      <div className="my-3 h-px bg-border" />

      {/* Línea de tiempo */}
      <div className="px-1">
        {/* Etiquetas */}
        <div className="relative h-4">
          {nodes.map((n) => (
            <span
              key={n.key}
              className={cn(
                "absolute top-0 overflow-hidden text-ellipsis text-[12px] font-semibold tracking-[0.01em]",
                n.align === "center" ? "whitespace-nowrap" : "max-w-[42%] whitespace-nowrap",
                n.key === nextPendingKey
                  ? "text-primary"
                  : n.reached
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              style={anchorStyle(n.pct, n.align)}
            >
              {n.label}
            </span>
          ))}
        </div>

        {/* Riel */}
        <div className="relative mt-1.5 h-3.5">
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-border" />
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
          {nodes.map((n) => (
            <span
              key={n.key}
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors",
                n.key === nextPendingKey
                  ? "h-3.5 w-3.5 border-primary bg-card ring-2 ring-primary/25"
                  : n.reached
                  ? "h-3 w-3 border-primary/60 bg-primary/60"
                  : "h-3 w-3 border-border bg-card"
              )}
              style={{ left: `${n.pct}%` }}
            />
          ))}
          {progressPct > 0 && progressPct < 100 && (
            <span
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
              style={{ left: `${progressPct}%` }}
            />
          )}
        </div>

        {/* Fechas */}
        <div className="relative mt-1.5 h-4">
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
    </div>
  );
}
