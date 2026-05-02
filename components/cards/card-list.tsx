import Link from "next/link";
import { Archive } from "lucide-react";
import { WalletCard } from "./wallet-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentPeriod, getAmountInPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import { isSameDay } from "date-fns";
import type { Card, Expense } from "@/lib/supabase/database.types";

interface CardWithTotal extends Card {
  expenses: Expense[];
}

interface CardListProps {
  cards: CardWithTotal[];
}

function getCardTotal(card: CardWithTotal): number {
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
    <div className="space-y-3">
      {activeCards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}

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
          <div className="mt-2 space-y-3 opacity-60">
            {archivedCards.map((card) => (
              <CardItem key={card.id} card={card} archived />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function CardItem({
  card,
  archived,
}: {
  card: CardWithTotal;
  archived?: boolean;
}) {
  const period = getCurrentPeriod(card);
  const total = getCardTotal(card);
  const dueToday = isSameDay(period.due, new Date());

  return (
    <Link
      href={`/cards/${card.id}`}
      className="block transition-all active:scale-[0.99]"
    >
      <WalletCard card={card} total={total} compact />
      {/* Pie textual debajo de la tarjeta */}
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>{period.label}</span>
        {archived ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
            Archivada
          </span>
        ) : dueToday ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Vence hoy
          </span>
        ) : (
          <span>vence {formatDate(period.due, "d/M")}</span>
        )}
      </div>
    </Link>
  );
}
