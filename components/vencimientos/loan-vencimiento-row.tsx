"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleInstallmentPaid } from "@/actions/loans";
import { Money } from "@/components/shared/money";
import { cn, formatLongDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { LoanVencimiento } from "@/lib/vencimientos";

function dueText(item: LoanVencimiento): { text: string; tone: "muted" | "amber" | "red" } {
  if (item.overdue) {
    const d = Math.abs(item.daysUntil);
    return { text: `Venció hace ${d} día${d === 1 ? "" : "s"}`, tone: "red" };
  }
  if (item.daysUntil === 0) return { text: "Vence hoy", tone: "amber" };
  if (item.daysUntil <= 3) return { text: `Vence en ${item.daysUntil} días`, tone: "amber" };
  return { text: `Vence el ${formatLongDate(parseLocalDate(item.dueDateKey))}`, tone: "muted" };
}

/** Fila de préstamo en /vencimientos: incluye checkbox para marcar la cuota
 *  como pagada sin salir de la lista (recalcula el acumulado al instante). */
export function LoanVencimientoRow({ item }: { item: LoanVencimiento }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const accent = item.accent || "#6366f1";
  const { text, tone } = dueText(item);
  const toneClass =
    tone === "red"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-500"
        : "text-muted-foreground";

  function markPaid() {
    startTransition(async () => {
      const res = await toggleInstallmentPaid(item.installmentId, true);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Cuota marcada como pagada");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] border bg-background/40 px-3 py-2.5",
        item.overdue ? "border-destructive/40" : "border-border"
      )}
    >
      <button
        type="button"
        onClick={markPaid}
        disabled={isPending}
        aria-label="Marcar cuota como pagada"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-transparent text-transparent transition-all hover:border-foreground/40 active:scale-90"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <Link
        href={`/prestamos/${item.loanId}`}
        className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Banknote className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">{item.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cuota {item.installmentNumber}/{item.totalInstallments}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <Money
            amount={item.amount}
            className="block text-[14px] font-semibold tabular-nums text-foreground"
          />
          <p className={cn("mt-0.5 text-[10.5px] font-semibold", toneClass)}>{text}</p>
        </div>
      </Link>
    </div>
  );
}
