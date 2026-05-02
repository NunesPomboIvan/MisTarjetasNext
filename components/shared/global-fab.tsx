"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickExpenseSheet } from "@/components/expenses/quick-expense-sheet";
import type { Card, Category } from "@/lib/supabase/database.types";

interface GlobalFabProps {
  cards: Card[];
  categories: Category[];
}

/**
 * Botón flotante global ("+") que abre el bottom sheet de ingreso rápido.
 *
 * Se oculta en las rutas que ya tienen el formulario completo en pantalla
 * o donde la acción "+" no aplica:
 *  - /expenses/new
 *  - /expenses/[id]/edit
 *  - /cards/new
 *  - /cards/[id]/edit
 *  - /login y rutas de auth (no aplica: ya están fuera del layout protegido)
 */
export function GlobalFab({ cards, categories }: GlobalFabProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const hidden =
    pathname?.startsWith("/expenses/new") ||
    pathname?.match(/^\/expenses\/[^/]+\/edit/) ||
    pathname?.startsWith("/cards/new") ||
    pathname?.match(/^\/cards\/[^/]+\/edit/);

  // Detectar si estamos en /cards/[id] para pre-seleccionar esa tarjeta
  const cardDetailMatch = pathname?.match(/^\/cards\/([^/]+)$/);
  const defaultCardId = cardDetailMatch ? cardDetailMatch[1] : undefined;

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Nuevo consumo"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "gradient-primary text-white shadow-brand transition-all",
          "active:scale-95 hover:scale-105",
          // Posicionado por encima del BottomNav (4rem alto + safe area)
          "right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
          "ring-4 ring-background/40"
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <QuickExpenseSheet
        open={open}
        onOpenChange={setOpen}
        cards={cards}
        categories={categories}
        defaultCardId={defaultCardId}
      />
    </>
  );
}
