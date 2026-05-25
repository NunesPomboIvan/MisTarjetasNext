"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WalletCard } from "@/components/cards/wallet-card";
import { CardPressWrapper } from "@/components/cards/card-press-wrapper";
import type { Card } from "@/lib/supabase/database.types";

export interface HomeCardItem {
  card: Card;
  total: number;
  closeLabel?: string;
  dueLabel?: string;
}

interface HomeCardsCarouselProps {
  items: HomeCardItem[];
}

export function HomeCardsCarousel({ items }: HomeCardsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotsStartXRef = useRef<number | null>(null);
  const dotsStartIdxRef = useRef<number>(0);
  const multi = items.length > 1;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-card-item]")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = cards.indexOf(entry.target as HTMLElement);
            if (i !== -1) setActiveIndex(i);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [items.length]);

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.querySelectorAll<HTMLElement>("[data-card-item]")[index];
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  // Drag sobre la barra de dots para moverse entre tarjetas
  function onDotsPointerDown(e: React.PointerEvent) {
    if (!multi) return;
    dotsStartXRef.current = e.clientX;
    dotsStartIdxRef.current = activeIndex;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDotsPointerMove(e: React.PointerEvent) {
    if (dotsStartXRef.current == null) return;
    const dx = e.clientX - dotsStartXRef.current;
    const stepPx = 32;
    const delta = Math.round(dx / stepPx);
    const next = Math.max(
      0,
      Math.min(items.length - 1, dotsStartIdxRef.current + delta)
    );
    if (next !== activeIndex) scrollTo(next);
  }
  function onDotsPointerUp(e: React.PointerEvent) {
    if (dotsStartXRef.current == null) return;
    dotsStartXRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Carrusel */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
      >
        {items.map(({ card, total, closeLabel, dueLabel }) => {
          return (
            <div
              key={card.id}
              data-card-item
              className="snap-center"
              style={{ flex: multi ? "0 0 calc(100% - 3rem)" : "0 0 100%" }}
            >
              <CardPressWrapper
                href={`/cards/${card.id}`}
                cardId={card.id}
                cardName={card.bank || card.name}
                className="block transition-transform duration-150 active:scale-[0.985]"
              >
                <WalletCard
                  card={card}
                  total={total}
                  compact
                  closeLabel={closeLabel}
                  dueLabel={dueLabel}
                />
              </CardPressWrapper>
            </div>
          );
        })}
      </div>

      {/* Dots — toda la zona es arrastrable */}
      {multi && (
        <div
          className="flex cursor-grab items-center justify-center gap-1.5 py-1 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onDotsPointerDown}
          onPointerMove={onDotsPointerMove}
          onPointerUp={onDotsPointerUp}
          onPointerCancel={onDotsPointerUp}
        >
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Tarjeta ${i + 1}`}
              className="transition-all duration-200"
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === activeIndex ? "var(--primary)" : "var(--border)",
                opacity: i === activeIndex ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
