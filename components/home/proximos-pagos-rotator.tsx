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
  intervalMs = 2200,
}: ProximosPagosRotatorProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [dragDx, setDragDx] = React.useState(0);
  const dragStartXRef = React.useRef<number | null>(null);
  const dotsStartXRef = React.useRef<number | null>(null);
  const dotsStartIdxRef = React.useRef<number>(0);

  const itemsLen = items.length;

  React.useEffect(() => {
    if (itemsLen <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % itemsLen);
    }, intervalMs);
    return () => clearInterval(id);
  }, [itemsLen, paused, intervalMs]);

  // Si cambia la cantidad de items y el índice queda fuera, lo reseteamos
  React.useEffect(() => {
    if (index >= itemsLen) setIndex(0);
  }, [itemsLen, index]);

  const goNext = React.useCallback(() => {
    setIndex((i) => (i + 1) % itemsLen);
  }, [itemsLen]);
  const goPrev = React.useCallback(() => {
    setIndex((i) => (i - 1 + itemsLen) % itemsLen);
  }, [itemsLen]);

  // Swipe sobre la tarjeta
  function onCardTouchStart(e: React.TouchEvent) {
    setPaused(true);
    dragStartXRef.current = e.touches[0].clientX;
    setDragDx(0);
  }
  function onCardTouchMove(e: React.TouchEvent) {
    if (dragStartXRef.current == null) return;
    setDragDx(e.touches[0].clientX - dragStartXRef.current);
  }
  function onCardTouchEnd() {
    if (dragStartXRef.current == null) return;
    const dx = dragDx;
    dragStartXRef.current = null;
    setDragDx(0);
    setPaused(false);
    if (Math.abs(dx) > 40 && itemsLen > 1) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  // Drag sobre los dots: convertimos el desplazamiento horizontal en cambios de índice
  function onDotsPointerDown(e: React.PointerEvent) {
    if (itemsLen <= 1) return;
    setPaused(true);
    dotsStartXRef.current = e.clientX;
    dotsStartIdxRef.current = index;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDotsPointerMove(e: React.PointerEvent) {
    if (dotsStartXRef.current == null) return;
    const dx = e.clientX - dotsStartXRef.current;
    const stepPx = 28;
    const delta = Math.round(dx / stepPx);
    const next = Math.max(
      0,
      Math.min(itemsLen - 1, dotsStartIdxRef.current + delta)
    );
    if (next !== index) setIndex(next);
  }
  function onDotsPointerUp(e: React.PointerEvent) {
    if (dotsStartXRef.current == null) return;
    dotsStartXRef.current = null;
    setPaused(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  if (itemsLen === 0) return null;

  const current = items[index];
  const urgent = current.daysUntilDue <= 3;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        onTouchStart={onCardTouchStart}
        onTouchMove={onCardTouchMove}
        onTouchEnd={onCardTouchEnd}
        style={{
          transform: `translateX(${dragDx}px)`,
          transition: dragDx === 0 ? "transform 0.25s ease" : "none",
          touchAction: "pan-y",
        }}
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
      </div>

      {/* Indicadores tipo carrusel — la zona entera es arrastrable */}
      {itemsLen > 1 && (
        <div
          className="mt-2.5 flex cursor-grab items-center justify-center gap-1.5 py-2 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onDotsPointerDown}
          onPointerMove={onDotsPointerMove}
          onPointerUp={onDotsPointerUp}
          onPointerCancel={onDotsPointerUp}
        >
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
