"use client";

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
  /** Altura máxima de cada tarjeta en px (para compactar la home). */
  maxH?: number;
}

export function HomeCardsCarousel({ items, maxH }: HomeCardsCarouselProps) {
  const multi = items.length > 1;

  if (items.length === 0) return null;

  return (
    // Carrusel con swipe horizontal. Sin indicador de paginación.
    <div
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
              maxH={maxH}
            />
          </CardPressWrapper>
        </div>
      ))}
    </div>
  );
}
