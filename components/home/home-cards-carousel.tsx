"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
  // +1 por la tarjeta "Agregar tarjeta" al final del carrusel.
  const slideCount = items.length + 1;
  const multi = slideCount > 1;
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

        {/* Último ítem: alta de tarjeta, mismo tamaño que una tarjeta real */}
        <div
          data-card-item
          className="snap-center"
          style={{ flex: multi ? "0 0 86%" : "0 0 100%" }}
        >
          <Link
            href="/cards/new"
            aria-label="Agregar tarjeta"
            className="focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-border text-muted-foreground transition-transform duration-150 active:scale-[0.985] dark:border-white/[0.18]"
            style={{ aspectRatio: "1.586 / 1", minHeight: 170, maxHeight: maxH ?? 240 }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-[14px] font-semibold text-foreground">Agregar tarjeta</span>
          </Link>
        </div>
      </div>

      {/* Indicadores de paginación */}
      {multi && (
        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          {Array.from({ length: slideCount }, (_, i) => (
            <span
              key={i}
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
