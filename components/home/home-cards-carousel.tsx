"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CardHero } from "@/components/cards/card-hero";
import { CardPressWrapper } from "@/components/cards/card-press-wrapper";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/periods/calculate";
import type { Card } from "@/lib/supabase/database.types";

/** Datos de la línea de tiempo del período actual, ya formateados en el servidor. */
export interface HomeCardTimeline {
  statusText: string;
  closePct: number;
  progressPct: number;
  lastDueLabel: string;
  closeLabel: string;
  dueLabel: string;
  lastDueReached: boolean;
  closeReached: boolean;
  dueReached: boolean;
  highlightKey: "close" | "due" | null;
}

export interface HomeCardItem {
  card: Card;
  total: number;
  period: Period;
  timeline: HomeCardTimeline;
}

interface HomeCardsCarouselProps {
  items: HomeCardItem[];
}

export function HomeCardsCarousel({ items }: HomeCardsCarouselProps) {
  // +1 por la tarjeta "Agregar tarjeta" al final del carrusel.
  const slideCount = items.length + 1;
  const multi = slideCount > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Tarjeta activa = la más visible dentro del carrusel. IntersectionObserver
  // es más confiable que calcular en onScroll (con snap + inercia en iOS el
  // scroll puede no reportar la posición final).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const slides = Array.from(el.children) as HTMLElement[];
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestRatio = -1;
        slides.forEach((slide, i) => {
          const r = ratios.get(slide) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = i;
          }
        });
        setActiveIndex(best);
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [slideCount]);

  function goTo(i: number) {
    const el = containerRef.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2,
      behavior: "smooth",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Carrusel con swipe horizontal. Cada card ocupa ~86% del viewport
          para que la siguiente asome como un "peek" parejo en el borde. */}
      <div
        ref={containerRef}
        className="relative flex items-start snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
      >
        {items.map(({ card, total, period, timeline }) => (
          <div
            key={card.id}
            data-card-item
            className="snap-center"
            style={{ flex: multi ? "0 0 86%" : "0 0 100%" }}
          >
            {/* Mismo formato que el detalle de la tarjeta (CardHero), sin
                navegación de período ni "Pendiente de pago". */}
            <CardPressWrapper
              href={`/cards/${card.id}`}
              bank={card.bank || card.name}
              lastFour={card.last_four}
              total={total}
              className="block rounded-[28px] transition-transform duration-150 active:scale-[0.985]"
            >
              <CardHero
                readOnly
                card={card}
                cardId={card.id}
                currentPeriod={period}
                saldo={total}
                paid={false}
                paidDate={null}
                {...timeline}
              />
            </CardPressWrapper>
          </div>
        ))}

        {/* Último ítem: alta de tarjeta, estirada al alto de la fila */}
        <div
          data-card-item
          className="snap-center self-stretch"
          style={{ flex: multi ? "0 0 86%" : "0 0 100%" }}
        >
          <Link
            href="/cards/new"
            aria-label="Agregar tarjeta"
            className="focus-ring flex h-full w-full flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-border text-muted-foreground transition-transform duration-150 active:scale-[0.985] dark:border-white/[0.18]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-[14px] font-semibold text-foreground">Agregar tarjeta</span>
          </Link>
        </div>
      </div>

      {/* Indicadores de paginación: siguen al deslizamiento y se pueden tocar
          para saltar a esa tarjeta (área táctil más grande que el punto). */}
      {multi && (
        <div className="flex items-center justify-center">
          {Array.from({ length: slideCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={i < items.length ? `Ir a la tarjeta ${i + 1}` : "Ir a agregar tarjeta"}
              aria-current={i === activeIndex}
              className="flex h-6 items-center px-[3px]"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-200",
                  i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
