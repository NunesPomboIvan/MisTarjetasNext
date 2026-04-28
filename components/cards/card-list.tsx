import Link from "next/link";
import { ChevronRight, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardLogo } from "./card-logo";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { Card, Expense } from "@/lib/supabase/database.types";

interface CardWithTotal extends Card {
  expenses: Expense[];
}

interface CardListProps {
  cards: CardWithTotal[];
}

function getCardTotal(card: CardWithTotal): number {
  const period = getCurrentPeriod(card);
  return card.expenses
    .filter((e) => {
      // Sumar la cuota correspondiente al período actual
      const expDate = new Date(e.expense_date + "T00:00:00");
      const { getInstallmentDates } = require("@/lib/periods/calculate");
      const dates: Date[] = getInstallmentDates(e);
      return dates.some(
        (d: Date) =>
          d >= period.start && d <= period.end
      );
    })
    .reduce((sum, e) => sum + e.installment_amount, 0);
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
            <span>{archivedCards.length} tarjeta{archivedCards.length !== 1 ? "s" : ""} archivada{archivedCards.length !== 1 ? "s" : ""}</span>
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {archivedCards.map((card) => (
              <CardItem key={card.id} card={card} archived />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function CardItem({ card, archived }: { card: CardWithTotal; archived?: boolean }) {
  const period = getCurrentPeriod(card);
  const total = getCardTotal(card);

  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-150 active:scale-[0.98] hover:shadow-md"
    >
      {/* Color dot + logo */}
      <div className="relative flex-shrink-0">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: card.color + "20" }}
        >
          <CardLogo type={card.type} size="sm" />
        </div>
        <div
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card"
          style={{ backgroundColor: card.color }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground">{card.name}</p>
          {archived && (
            <Badge variant="secondary" className="text-xs">Archivada</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          •••• {card.last_four} · cierra el {parseInt(card.close_date.split("-")[2], 10)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: period.status === "current" ? "#22c55e" : "#e7e5e4",
              color: period.status === "current" ? "#22c55e" : undefined,
            }}
          >
            {period.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            vence {formatDate(period.due, "d/M")}
          </span>
        </div>
      </div>

      {/* Total del período */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <Money amount={total} gradient={total > 0} size="lg" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
