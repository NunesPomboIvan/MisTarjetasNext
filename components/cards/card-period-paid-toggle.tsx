"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleCardPeriodPaid } from "@/actions/cards";
import { cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";

interface CardPeriodPaidToggleProps {
  cardId: string;
  periodKey: string;
  paid: boolean;
  paidDate: string | null;
}

/** Marca el período que se está viendo como pagado/no pagado. Se refleja al
 *  instante en /vencimientos, ya que ambos leen la misma tabla. */
export function CardPeriodPaidToggle({
  cardId,
  periodKey,
  paid,
  paidDate,
}: CardPeriodPaidToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleCardPeriodPaid(cardId, periodKey, !paid);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(paid ? "Período marcado como no pagado" : "Período marcado como pagado");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        paid
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-card hover:border-foreground/30"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
          paid
            ? "border-transparent bg-emerald-500 text-white"
            : "border-border bg-transparent text-transparent"
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">
          {paid ? "Período pagado" : "Marcar período como pagado"}
        </span>
        {paid && paidDate && (
          <span className="block text-[11px] text-muted-foreground">
            Pagado el {formatDate(parseLocalDate(paidDate), "d/M/yyyy")}
          </span>
        )}
      </span>
    </button>
  );
}
