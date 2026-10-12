"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cardLabel } from "@/lib/cards/card-type-label";
import type { Card } from "@/lib/supabase/database.types";

export type CardSwitcherOption = Pick<Card, "id" | "name" | "last_four" | "type" | "color">;

interface CardSwitcherMenuProps {
  cards: CardSwitcherOption[];
  /** Tarjeta que se está viendo: se marca con un tilde. */
  currentId: string;
}

/**
 * Botón "Tarjetas" de la fila de acciones del detalle de tarjeta: despliega
 * las tarjetas activas del titular para saltar directo al detalle de otra.
 */
export function CardSwitcherMenu({ cards, currentId }: CardSwitcherMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[11px] font-semibold text-foreground/80 transition-colors hover:text-foreground">
        <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
        Tarjetas
        <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {cards.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => {
              if (c.id !== currentId) router.push(`/cards/${c.id}`);
            }}
          >
            <span
              className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <span className="min-w-0 flex-1 truncate">{cardLabel(c)}</span>
            {c.id === currentId && <Check className="ml-2 h-4 w-4 flex-shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
