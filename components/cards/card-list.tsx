import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentPeriod, getAmountInPeriodArs } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import { CardsSortable, type CardSortItem } from "./cards-sortable";
import type { Card, Expense } from "@/lib/supabase/database.types";

interface CardWithExpenses extends Card {
  expenses: Expense[];
}

interface CardListProps {
  cards: CardWithExpenses[];
}

/**
 * Calcula la metadata de período (total, cierre, vencimiento) en el servidor y
 * la pasa al componente cliente que ordena y renderiza. `getCurrentPeriod`
 * devuelve el período que está acumulando, así que `end`/`due` son siempre el
 * próximo cierre y vencimiento — lo mismo que se muestra en cada tarjeta.
 */
function toItem(card: CardWithExpenses): CardSortItem {
  const period = getCurrentPeriod(card);
  const total = card.expenses.reduce(
    (sum, e) => sum + getAmountInPeriodArs(e, period),
    0
  );
  // No enviamos los consumos al cliente: la metadata ya está calculada acá.
  const cardData: Card = { ...card };
  delete (cardData as Partial<CardWithExpenses>).expenses;
  return {
    card: cardData,
    total,
    closeLabel: formatDate(period.end, "d MMM"),
    dueLabel: formatDate(period.due, "d MMM"),
    closeTime: period.end.getTime(),
    dueTime: period.due.getTime(),
    bank: (card.bank || card.name || "").trim(),
  };
}

export function CardList({ cards }: CardListProps) {
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

  const active = cards.filter((c) => !c.archived).map(toItem);
  const archived = cards.filter((c) => c.archived).map(toItem);

  return <CardsSortable active={active} archived={archived} />;
}
