"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NewExpenseHero } from "./new-expense-hero";
import type { Card, Category } from "@/lib/supabase/database.types";

interface NewExpenseModalProps {
  cards: Card[];
  categories: Category[];
  defaultCardId?: string;
  feeMode?: boolean;
}

/**
 * Envuelve {@link NewExpenseHero} en un bottom sheet. Se renderiza desde la
 * ruta interceptada `@modal/(.)expenses/new`, de modo que al tocar "Agregar
 * consumo" en cualquier parte de la app se despliega sobre la pantalla actual
 * en lugar de navegar a una pantalla aparte. Al cerrar volvemos con
 * `router.back()` para que la URL quede consistente con el historial.
 */
export function NewExpenseModal({
  cards,
  categories,
  defaultCardId,
  feeMode,
}: NewExpenseModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  function close() {
    // Animamos el cierre y luego deshacemos la navegación interceptada.
    setOpen(false);
    setTimeout(() => router.back(), 200);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="sr-only">Nuevo consumo</SheetTitle>
        <NewExpenseHero
          cards={cards}
          categories={categories}
          defaultCardId={defaultCardId}
          feeMode={feeMode}
          onClose={close}
        />
      </SheetContent>
    </Sheet>
  );
}
