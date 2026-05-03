"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { WalletCard } from "@/components/cards/wallet-card";
import type { Card } from "@/lib/supabase/database.types";

interface CardSummary {
  card: Card;
  total: number;
}

interface HomeCardsStackProps {
  cardSummaries: CardSummary[];
}

export function HomeCardsStack({ cardSummaries }: HomeCardsStackProps) {
  const [hide, setHide] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHide(localStorage.getItem("hideBalance") === "true");
    } catch {}
  }, []);

  function toggle() {
    const next = !hide;
    setHide(next);
    try {
      localStorage.setItem("hideBalance", String(next));
    } catch {}
  }

  // Detecta qué card es visible con IntersectionObserver
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];

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
  }, [cardSummaries.length]);

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  if (cardSummaries.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Mis tarjetas
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label={hide ? "Mostrar saldos" : "Ocultar saldos"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            {hide ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
          <Link href="/cards" className="text-[13px] font-semibold text-primary">
            Ver todas
          </Link>
        </div>
      </div>

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
        {cardSummaries.map(({ card, total }) => (
          <div
            key={card.id}
            className="w-full flex-shrink-0 snap-center"
          >
            <Link
              href={`/cards/${card.id}`}
              className="block transition-transform active:scale-[0.985]"
            >
              <WalletCard card={card} total={total} compact hideBalance={hide} />
            </Link>
          </div>
        ))}
      </div>

      {/* Dots — solo si hay más de una */}
      {cardSummaries.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {cardSummaries.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Tarjeta ${i + 1}`}
              className="transition-all duration-200"
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background:
                  i === activeIndex
                    ? "var(--primary)"
                    : "var(--border)",
                opacity: i === activeIndex ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
