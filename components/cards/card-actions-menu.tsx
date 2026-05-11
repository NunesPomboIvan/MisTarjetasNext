"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Receipt, Calendar, BarChart3, Bell, Lock, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CardActionsMenuProps {
  cardId: string;
}

export function CardActionsMenu({ cardId }: CardActionsMenuProps) {
  const router = useRouter();

  const go = (href: string) => () => router.push(href);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Más opciones"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={go(`/cards/${cardId}/movimientos`)}>
          <Receipt className="mr-2 h-4 w-4" />
          Movimientos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={go(`/cards/${cardId}/pagos`)}>
          <Calendar className="mr-2 h-4 w-4" />
          Próximos pagos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={go(`/cards/${cardId}/stats`)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Estadísticas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={go(`/cards/${cardId}/settings`)}>
          <Bell className="mr-2 h-4 w-4" />
          Ajustes y notificaciones
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={go(`/cards/${cardId}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar tarjeta
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={go(`/cards/${cardId}/block`)}
        >
          <Lock className="mr-2 h-4 w-4" />
          Bloquear tarjeta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
