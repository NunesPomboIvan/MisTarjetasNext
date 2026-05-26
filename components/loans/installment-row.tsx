"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleInstallmentPaid } from "@/actions/loans";
import { Money } from "@/components/shared/money";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { LoanInstallment } from "@/lib/supabase/database.types";

interface InstallmentRowProps {
  installment: LoanInstallment;
  total: number;
  accent: string;
  /** true si esta cuota es la próxima pendiente del préstamo */
  isNext: boolean;
}

export function InstallmentRow({ installment, total, accent, isNext }: InstallmentRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const paid = installment.paid;

  function toggle() {
    startTransition(async () => {
      const res = await toggleInstallmentPaid(installment.id, !paid);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  const dueLabel = capitalize(formatDate(parseLocalDate(installment.due_date), "d 'de' MMM"));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] border p-3 transition-colors",
        paid
          ? "border-border/50 bg-muted/20 opacity-70"
          : isNext
            ? "border-border bg-card"
            : "border-border bg-card"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={paid ? "Marcar como impaga" : "Marcar como pagada"}
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
          paid
            ? "border-transparent text-white"
            : "border-border bg-transparent text-transparent hover:border-foreground/40"
        )}
        style={paid ? { background: accent } : undefined}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-semibold tabular-nums",
            paid ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          Cuota {installment.installment_number}/{total}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {paid && installment.paid_date
            ? `Pagada el ${formatDate(parseLocalDate(installment.paid_date), "d/M/yyyy")}`
            : `Vence ${dueLabel}`}
        </p>
      </div>

      <Money
        amount={Number(installment.amount)}
        className={cn(
          "flex-shrink-0 text-[14px] font-semibold tabular-nums",
          paid ? "text-muted-foreground line-through" : "text-foreground"
        )}
      />
    </div>
  );
}
