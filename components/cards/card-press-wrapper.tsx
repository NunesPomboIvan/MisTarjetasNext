"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface CardPressWrapperProps {
  /** Página de detalle (tap corto) */
  href: string;
  cardId: string;
  cardName: string;
  children: React.ReactNode;
  className?: string;
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 10;

/**
 * Envuelve una tarjeta: tap corto navega al detalle; mantenerla apretada
 * abre opciones para editar o eliminar.
 */
export function CardPressWrapper({
  href,
  cardId,
  cardName,
  children,
  className,
}: CardPressWrapperProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const longPressedRef = React.useRef(false);
  const movedRef = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 2) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    longPressedRef.current = false;
    movedRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = Math.abs(e.clientX - startRef.current.x);
    const dy = Math.abs(e.clientY - startRef.current.y);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      movedRef.current = true;
      clearTimer();
    }
  }

  function onPointerUp() {
    clearTimer();
    if (!longPressedRef.current && !movedRef.current) {
      router.push(href);
    }
    startRef.current = null;
  }

  function onPointerCancel() {
    clearTimer();
    startRef.current = null;
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCard(cardId);
      // deleteCard redirige en éxito; si vuelve, hubo error
      if (result && !result.success) {
        toast.error(result.error ?? "No se pudo eliminar la tarjeta");
        return;
      }
      setConfirmOpen(false);
      setMenuOpen(false);
    });
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(href);
          }
        }}
        className={className}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        {children}
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="pb-safe px-0">
          <SheetHeader className="px-5 pb-1">
            <SheetTitle className="truncate">{cardName}</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/50">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/cards/${cardId}/edit`);
              }}
              className="flex w-full items-center gap-3.5 px-5 py-4 text-left text-[15px] font-medium text-foreground transition-colors active:bg-muted/60"
            >
              <Pencil className="h-5 w-5 text-muted-foreground" />
              Editar tarjeta
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex w-full items-center gap-3.5 px-5 py-4 text-left text-[15px] font-medium text-destructive transition-colors active:bg-muted/60"
            >
              <Trash2 className="h-5 w-5" />
              Eliminar tarjeta
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {cardName}?</AlertDialogTitle>
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
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
