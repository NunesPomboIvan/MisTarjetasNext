"use client";

import { useRef, useState } from "react";
import { WalletCard } from "@/components/cards/wallet-card";
import { CardPressWrapper } from "@/components/cards/card-press-wrapper";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/supabase/database.types";

export interface HomeCardItem {
  card: Card;
  total: number;
  closeLabel?: string;
  dueLabel?: string;
}

interface HomeCardsCarouselProps {
  items: HomeCardItem[];
  /** Altura máxima de cada tarjeta en px (para compactar la home). */
  maxH?: number;
}

export function HomeCardsCarousel({ items, maxH }: HomeCardsCarouselProps) {
  const multi = items.length > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    children.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - containerCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Carrusel con swipe horizontal. Cada card ocupa ~86% del viewport
          para que la siguiente asome como un "peek" parejo en el borde. */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
      >
        {items.map(({ card, total, closeLabel, dueLabel }) => (
          <div
            key={card.id}
            data-card-item
            className="snap-center"
            style={{ flex: multi ? "0 0 86%" : "0 0 100%" }}
          >
            <CardPressWrapper
              href={`/cards/${card.id}`}
              bank={card.bank || card.name}
              lastFour={card.last_four}
              total={total}
              className="block transition-transform duration-150 active:scale-[0.985]"
            >
              <WalletCard
                card={card}
                total={total}
                compact
                closeLabel={closeLabel}
                dueLabel={dueLabel}
                maxH={maxH}
              />
            </CardPressWrapper>
          </div>
        ))}
      </div>

      {/* Indicadores de paginación */}
      {multi && (
        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.card.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
