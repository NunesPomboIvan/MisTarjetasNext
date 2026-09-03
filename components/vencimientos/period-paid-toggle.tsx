"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleCardPeriodPaid } from "@/actions/cards";
import { toggleInstallmentPaid } from "@/actions/loans";
import { cn } from "@/lib/utils";
import type { PeriodItemStatus } from "@/lib/vencimientos";

const STYLES: Record<PeriodItemStatus, string> = {
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  overdue: "border-destructive/40 bg-destructive/10 text-destructive",
  pending: "border-border bg-transparent text-muted-foreground",
};

const LABELS: Record<PeriodItemStatus, string> = {
  paid: "Pagado",
  overdue: "Vencido",
  pending: "Pendiente",
};

type Props =
  | { kind: "card"; cardId: string; periodKey: string; status: PeriodItemStatus }
  | { kind: "loan"; installmentId: string; status: PeriodItemStatus };

/**
 * Pill de estado de un ítem del período que además togglea el pago con un tap.
 * Tarjetas → card_period_payments; préstamos → loan_installments. Se refleja al
 * instante en /vencimientos y en el detalle de la tarjeta/préstamo.
 */
export function PeriodPaidToggle(props: Props) {
  const { status } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const paid = status === "paid";

  function toggle() {
    startTransition(async () => {
      const res =
        props.kind === "card"
          ? await toggleCardPeriodPaid(props.cardId, props.periodKey, !paid)
          : await toggleInstallmentPaid(props.installmentId, !paid);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(paid ? "Marcado como pendiente" : "Marcado como pagado");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={paid}
      aria-label={paid ? "Marcar como pendiente" : "Marcar como pagado"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors active:opacity-70 disabled:opacity-60",
        STYLES[status]
      )}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : paid ? (
        <Check className="h-3 w-3" />
      ) : null}
      {isPending ? "Guardando…" : LABELS[status]}
    </button>
  );
}
