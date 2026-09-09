"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { toggleCardPeriodPaid } from "@/actions/cards";
import { cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";

interface CardPeriodPaidToggleProps {
  cardId: string;
  periodKey: string;
  paid: boolean;
  paidDate: string | null;
}

/** Vibración liviana al togglear (no-op donde no está soportado). */
function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* ignore */
  }
}

/**
 * Chip compacto de estado del período: "Pagado" / "Marcar pagado".
 * Reemplaza a la fila completa con checkbox. La lógica, el estado y la
 * persistencia son idénticos: se sigue escribiendo en `card_period_payments`
 * y se refleja al instante en /vencimientos.
 */
export function CardPeriodPaidToggle({
  cardId,
  periodKey,
  paid,
  paidDate,
}: CardPeriodPaidToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function apply(next: boolean) {
    startTransition(async () => {
      const res = await toggleCardPeriodPaid(cardId, periodKey, next);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Período marcado como pagado" : "Período marcado como no pagado");
      router.refresh();
    });
  }

  function onClick() {
    if (isPending) return;
    haptic();
    if (paid) {
      // Des-marcar pide confirmación para evitar toques accidentales.
      setConfirmOpen(true);
    } else {
      apply(true);
    }
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={paid}
        aria-label="Marcar período como pagado"
        onClick={onClick}
        disabled={isPending}
        title={
          paid && paidDate
            ? `Pagado el ${formatDate(parseLocalDate(paidDate), "d/M/yyyy")}`
            : undefined
        }
        className={cn(
          "relative inline-flex items-center gap-[5px] rounded-full border px-[11px] py-[5px]",
          "text-[12px] font-semibold tracking-[0.01em] transition-colors duration-200",
          // Hit area mínima 44x44 sin agrandar el chip visualmente.
          "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:min-w-[44px] after:w-full",
          "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
          paid
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-400"
            : "border-foreground/15 bg-transparent text-muted-foreground hover:text-foreground/70"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : paid ? (
          <CheckCircle2
            key="paid"
            className="h-3.5 w-3.5 animate-in zoom-in-75 duration-200"
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{paid ? "Pagado" : "Marcar pagado"}</span>
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar período</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Marcar este período como no pagado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                haptic();
                apply(false);
              }}
              disabled={isPending}
            >
              {isPending ? "Guardando…" : "Desmarcar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
