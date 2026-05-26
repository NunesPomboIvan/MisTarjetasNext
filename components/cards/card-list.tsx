import { Archive } from "lucide-react";
import { WalletCard } from "./wallet-card";
import { CardPressWrapper } from "./card-press-wrapper";
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

  return (
    <div className="space-y-5">
      {activeCards.length > 0 && (
        <StackedWallet cards={activeCards} />
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
          <div className="mt-2 opacity-60">
            <StackedWallet cards={archivedCards} />
          </div>
        </details>
      )}
    </div>
  );
}

function StackedWallet({ cards }: { cards: CardWithExpenses[] }) {
  return (
    <div className="space-y-3">
      {cards.map((card) => {
        const period = getCurrentPeriod(card);
        const total = getCardTotal(card);
        return (
          <CardPressWrapper
            key={card.id}
            href={`/cards/${card.id}`}
            cardId={card.id}
            cardName={card.bank || card.name}
            className="block transition-transform duration-150 active:scale-[0.985]"
          >
            <WalletCard
              card={card}
              total={total}
              closeLabel={formatDate(period.end, "d MMM")}
              dueLabel={formatDate(period.due, "d MMM")}
            />
          </CardPressWrapper>
        );
      })}
    </div>
  );
}
