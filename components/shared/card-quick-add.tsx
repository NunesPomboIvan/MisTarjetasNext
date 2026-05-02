"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { QuickExpenseSheet } from "@/components/expenses/quick-expense-sheet";
import { cn } from "@/lib/utils";
import type { Card, Category } from "@/lib/supabase/database.types";

interface CardQuickAddProps {
  cardId: string;
  cards: Card[];
  categories: Category[];
  /** Variante visual: "icon" botón redondo, "chip" pill con texto */
  variant?: "icon" | "chip";
  className?: string;
}

/**
 * Botón "+" pequeño que abre el QuickExpenseSheet pre-seleccionando una tarjeta.
 * Usado en el dashboard al lado de cada tarjeta.
 */
export function CardQuickAdd({
  cardId,
  cards,
  categories,
  variant = "icon",
  className,
}: CardQuickAddProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Agregar consumo a esta tarjeta"
        onClick={(e) => {
          // Evitamos que el click se propague al <Link> contenedor
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          variant === "icon"
            ? "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary/20 active:scale-90"
            : "inline-flex h-7 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary transition-all hover:bg-primary/20",
          className
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {variant === "chip" && <span>Consumo</span>}
      </button>

      <QuickExpenseSheet
        open={open}
        onOpenChange={setOpen}
        cards={cards}
        categories={categories}
        defaultCardId={cardId}
      />
    </>
  );
}
