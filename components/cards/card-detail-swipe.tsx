"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardDetailSwipeProps {
  /** Id de la tarjeta anterior (o null si es la primera) */
  prevId: string | null;
  /** Id de la tarjeta siguiente (o null si es la última) */
  nextId: string | null;
  /** Posición actual (1-based) y total, para el indicador */
  position?: number;
  total?: number;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 60; // px mínimos para considerar swipe

/**
 * Permite navegar al detalle de la tarjeta anterior/siguiente deslizando
 * horizontalmente (o con las flechas laterales).
 */
export function CardDetailSwipe({
  prevId,
  nextId,
  position,
  total,
  children,
}: CardDetailSwipeProps) {
  const router = useRouter();
  const startX = React.useRef<number | null>(null);
  const startY = React.useRef<number | null>(null);

  // Usamos replace (no push) para que el swipe entre tarjetas NO acumule
  // historial: así el botón "volver" respeta el origen de navegación (Home o
  // listado) en vez de retroceder a la tarjeta vista por swipe.
  const goPrev = React.useCallback(() => {
    if (prevId) router.replace(`/cards/${prevId}`);
  }, [prevId, router]);
  const goNext = React.useCallback(() => {
    if (nextId) router.replace(`/cards/${nextId}`);
  }, [nextId, router]);

  React.useEffect(() => {
    if (prevId) router.prefetch(`/cards/${prevId}`);
    if (nextId) router.prefetch(`/cards/${nextId}`);
  }, [prevId, nextId, router]);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - (startY.current ?? 0);
    startX.current = null;
    startY.current = null;
    // Solo si el gesto es claramente horizontal
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {children}

      {/* Pager en flujo (no tapa el contenido): ‹  2 / 5  › */}
      {(prevId || nextId) && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prevId}
            aria-label="Tarjeta anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {total != null && total > 1 && position != null && (
            <span className="rounded-full bg-muted px-3 py-1 text-[12px] font-medium tabular-nums text-muted-foreground">
              {position} / {total}
            </span>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={!nextId}
            aria-label="Tarjeta siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
