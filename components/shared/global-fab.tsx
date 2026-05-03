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
 * Botón flotante global ("+ Agregar") tipo pill, gradiente cálido + halo difuso.
 * Se oculta en rutas que ya tienen formulario completo en pantalla.
 */
export function GlobalFab({ cards, categories }: GlobalFabProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const hidden =
    pathname?.startsWith("/expenses/new") ||
    pathname?.match(/^\/expenses\/[^/]+\/edit/) ||
    pathname?.startsWith("/cards/new") ||
    pathname?.match(/^\/cards\/[^/]+\/edit/);

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
          "group fixed z-40 flex items-center justify-center rounded-full",
          "right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
          "transition-all active:scale-95"
        )}
      >
        {/* Halo difuso detrás */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-8px] rounded-full"
          style={{
            background: "oklch(0.50 0.22 264)",
            filter: "blur(18px)",
            opacity: 0.45,
          }}
        />

        {/* Pill principal */}
        <span
          className={cn(
            "relative flex items-center gap-2 rounded-full px-5 py-3.5",
            "gradient-primary shadow-brand-glow text-white"
          )}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.22)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.3) inset",
            }}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Agregar
          </span>
        </span>
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
