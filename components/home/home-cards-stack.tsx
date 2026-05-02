"use client";

import { useState, useEffect } from "react";
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
  hideBalanceDefault?: boolean;
  onHideBalanceChange?: (hidden: boolean) => void;
}

const PEEK = 68;
const CARD_H = 174;

export function HomeCardsStack({ cardSummaries }: HomeCardsStackProps) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    try {
      setHide(localStorage.getItem("hideBalance") === "true");
    } catch {}
  }, []);

  function toggle() {
    const next = !hide;
    setHide(next);
    try { localStorage.setItem("hideBalance", String(next)); } catch {}
  }

  const stackH = cardSummaries.length > 0
    ? (cardSummaries.length - 1) * PEEK + CARD_H
    : 0;

  return (
    <section className="space-y-3">
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
            {hide
              ? <EyeOff className="h-3.5 w-3.5" />
              : <Eye className="h-3.5 w-3.5" />
            }
          </button>
          <Link href="/cards" className="text-[13px] font-semibold text-primary">
            Ver todas
          </Link>
        </div>
      </div>

      <div className="relative" style={{ height: stackH }}>
        {cardSummaries.map(({ card, total }, index) => (
          <div
            key={card.id}
            className="absolute left-0 right-0"
            style={{
              top: index * PEEK,
              zIndex: index + 1,
            }}
          >
            <Link
              href={`/cards/${card.id}`}
              className="block transition-transform active:scale-[0.99]"
            >
              <WalletCard card={card} total={total} compact hideBalance={hide} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
