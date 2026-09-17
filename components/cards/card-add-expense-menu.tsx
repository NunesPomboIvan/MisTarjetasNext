"use client";

import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Landmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CardAddExpenseMenuProps {
  cardId: string;
}

/**
 * Botón "+ Agregar" de la toolbar: reemplaza a los dos botones separados
 * (Gastos/Agregar) por uno solo con un menú de 2 opciones, para no amontonar
 * botones en la fila junto a Saldo y el menú de ajustes.
 */
export function CardAddExpenseMenu({ cardId }: CardAddExpenseMenuProps) {
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Agregar"
        className="inline-flex h-8 min-w-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="min-w-0 truncate">Agregar</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={go(`/expenses/new?card_id=${cardId}`)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nuevo consumo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={go(`/expenses/new?card_id=${cardId}&fee=1`)}>
          <Landmark className="mr-2 h-4 w-4" />
          Nuevo gasto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
