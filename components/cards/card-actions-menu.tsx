"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Receipt, Calendar, BarChart3, Bell, Lock, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCard } from "@/actions/cards";

interface CardActionsMenuProps {
  cardId: string;
  cardName?: string;
}

export function CardActionsMenu({ cardId, cardName }: CardActionsMenuProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const go = (href: string) => () => router.push(href);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCard(cardId);
      // deleteCard redirige a /cards en éxito; si vuelve, hubo error
      if (result && !result.success) {
        toast.error(result.error ?? "No se pudo eliminar la tarjeta");
        return;
      }
      setConfirmOpen(false);
    });
  }

  return (
    <>
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
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              // El menú se cierra al clickear; abrimos el diálogo en el próximo
              // tick para evitar el conflicto de foco entre ambos overlays.
              setTimeout(() => setConfirmOpen(true), 0);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar tarjeta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {cardName ?? "esta tarjeta"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la tarjeta y todos sus consumos. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
