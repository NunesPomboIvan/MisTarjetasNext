"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { WalletCard } from "@/components/cards/wallet-card";
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
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Carrusel */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map(({ card, total, closeLabel, dueLabel }, i) => {
          const isActive = i === activeIndex;
          const isLast = i === items.length - 1;
          return (
            <div
              key={card.id}
              data-card-item
              className={
                !multi
                  ? "w-full flex-shrink-0 snap-center"
                  : isLast
                    ? "w-[88%] flex-shrink-0 snap-end"
                    : "w-[88%] flex-shrink-0 snap-start"
              }
              style={{
                transition: "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.35s ease",
                transform: multi && !isActive ? "scale(0.94)" : "scale(1)",
                opacity: multi && !isActive ? 0.7 : 1,
              }}
            >
              <Link
                href={`/cards/${card.id}`}
                className="block active:scale-[0.985]"
                style={{ transition: "transform 0.15s ease" }}
              >
                <WalletCard
                  card={card}
                  total={total}
                  compact
                  closeLabel={closeLabel}
                  dueLabel={dueLabel}
                />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      {multi && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
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
