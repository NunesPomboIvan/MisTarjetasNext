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

  const goPrev = React.useCallback(() => {
    if (prevId) router.push(`/cards/${prevId}`);
  }, [prevId, router]);
  const goNext = React.useCallback(() => {
    if (nextId) router.push(`/cards/${nextId}`);
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

      {/* Flecha izquierda */}
      {prevId && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Tarjeta anterior"
          className="fixed left-1.5 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-foreground/70 shadow-sm backdrop-blur transition-colors hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Flecha derecha */}
      {nextId && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Tarjeta siguiente"
          className="fixed right-1.5 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-foreground/70 shadow-sm backdrop-blur transition-colors hover:text-foreground active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Indicador de posición */}
      {total != null && total > 1 && position != null && (
        <div className="pointer-events-none mt-1 flex items-center justify-center">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {position} / {total}
          </span>
        </div>
      )}
    </div>
  );
}
