"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Receipt, Calendar, BarChart3, Bell, Lock, Pencil, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
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
  /** Clave "YYYY-MM" del período que se está viendo, para el resumen descargable. */
  periodKey?: string;
}

export function CardActionsMenu({ cardId, cardName, periodKey }: CardActionsMenuProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const go = (href: string) => () => router.push(href);

  async function handleDownloadSummary() {
    try {
      const params = new URLSearchParams({ cardId });
      if (periodKey) params.set("period", periodKey);
      const res = await fetch(`/api/export/period-summary?${params}`);
      if (!res.ok) {
        toast.error("No se pudo generar el resumen");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "Resumen_Periodo.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Resumen descargado");
    } catch {
      toast.error("No se pudo generar el resumen");
    }
  }

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
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
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
          <DropdownMenuItem onClick={handleDownloadSummary}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Descargar resumen del período
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
