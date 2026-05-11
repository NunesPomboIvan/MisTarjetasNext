import Link from "next/link";
import { Archive } from "lucide-react";
import { WalletCard } from "./wallet-card";
import { CompactCardRow } from "./compact-card-row";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentPeriod, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { Card, Expense } from "@/lib/supabase/database.types";

interface CardWithExpenses extends Card {
  expenses: Expense[];
}

interface CardListProps {
  cards: CardWithExpenses[];
}

function getCardTotal(card: CardWithExpenses): number {
  const period = getCurrentPeriod(card);
  return card.expenses.reduce((sum, e) => sum + getAmountInPeriod(e, period), 0);
}

export function CardList({ cards }: CardListProps) {
  const activeCards = cards.filter((c) => !c.archived);
  const archivedCards = cards.filter((c) => c.archived);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={<span>💳</span>}
        title="Todavía no tenés tarjetas"
        description="Agregá tu primera tarjeta para empezar a registrar consumos"
        action={{ label: "Agregar tarjeta", href: "/cards/new" }}
      />
    );
  }

  // Primera tarjeta destacada como WalletCard, las demás compactas.
  const [first, ...rest] = activeCards;

  return (
    <div className="space-y-5">
      {first && (() => {
        const period = getCurrentPeriod(first);
        const total = getCardTotal(first);
        return (
          <Link
            href={`/cards/${first.id}`}
            className="block transition-transform active:scale-[0.985]"
          >
            <WalletCard
              card={first}
              total={total}
              closeLabel={formatDate(period.end, "d MMM")}
              dueLabel={formatDate(period.due, "d MMM")}
            />
          </Link>
        );
      })()}

      {rest.length > 0 && (
        <div className="space-y-2.5">
          {rest.map((card) => (
            <CompactCardRow
              key={card.id}
              card={card}
              balance={getCardTotal(card)}
              href={`/cards/${card.id}`}
            />
          ))}
        </div>
      )}

      {archivedCards.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm text-muted-foreground">
            <Archive className="h-4 w-4" />
            <span>
              {archivedCards.length} tarjeta
              {archivedCards.length !== 1 ? "s" : ""} archivada
              {archivedCards.length !== 1 ? "s" : ""}
            </span>
          </summary>
          <div className="mt-2 space-y-2.5 opacity-60">
            {archivedCards.map((card) => (
              <CompactCardRow
                key={card.id}
                card={card}
                balance={getCardTotal(card)}
                href={`/cards/${card.id}`}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
