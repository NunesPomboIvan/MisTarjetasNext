"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleCardPeriodPaid } from "@/actions/cards";
import { Money } from "@/components/shared/money";
import { cn, formatLongDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { CardVencimiento } from "@/lib/vencimientos";

function dueText(item: CardVencimiento): { text: string; tone: "muted" | "amber" | "red" } {
  if (item.overdue) {
    const d = Math.abs(item.daysUntil);
    return { text: `Venció hace ${d} día${d === 1 ? "" : "s"}`, tone: "red" };
  }
  if (item.daysUntil === 0) return { text: "Vence hoy", tone: "amber" };
  if (item.daysUntil <= 3) return { text: `Vence en ${item.daysUntil} días`, tone: "amber" };
  return { text: `Vence el ${formatLongDate(parseLocalDate(item.dueDateKey))}`, tone: "muted" };
}

/** Formatea un monto sin signo ni decimales: "$15.300" / "$8.200" / "$0". */
function formatAbsCurrency(diff: number): string {
  const abs = new Intl.NumberFormat("es-AR").format(Math.abs(Math.round(diff)));
  return `$${abs}`;
}

/** Formatea un porcentaje sin signo: "12,4%" / "6,1%" / "0,0%". */
function formatAbsPct(pct: number, decimals = 1): string {
  const abs = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(pct));
  return `${abs}%`;
}

/** Comparación del monto contra el mismo mes anterior de la tarjeta. */
function MonthOverMonthDiff({ amount, prevAmount }: { amount: number; prevAmount: number }) {
  const diff = amount - prevAmount;
  const pct = (diff / prevAmount) * 100;
  const toneClass =
    diff < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : diff > 0
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <p className={cn("mt-0.5 text-[10.5px] font-semibold tabular-nums", toneClass)}>
      {formatAbsCurrency(diff)}
      <span className="text-muted-foreground"> · </span>
      {formatAbsPct(pct)}
    </p>
  );
}

/** Fila de tarjeta en /vencimientos: incluye checkbox para marcar el período
 *  como pagado sin salir de la lista (recalcula el acumulado al instante). */
export function CardVencimientoRow({ item }: { item: CardVencimiento }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justPaid, setJustPaid] = useState(false);
  const accent = item.accent || "#6366f1";
  const { text, tone } = dueText(item);
  const toneClass =
    tone === "red"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-500"
        : "text-muted-foreground";

  const href = `/cards/${item.cardId}${item.offset ? `?offset=${item.offset}` : ""}`;

  function markPaid() {
    setJustPaid(true);
    startTransition(async () => {
      const res = await toggleCardPeriodPaid(item.cardId, item.periodKey, true);
      if (!res.success) {
        setJustPaid(false);
        toast.error(res.error);
        return;
      }
      toast.success("Período marcado como pagado");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-[14px] border bg-background/40 px-3 py-2.5",
        item.overdue ? "border-destructive/40" : "border-border"
      )}
    >
      <Link href={href} className="flex items-center gap-3 active:opacity-70">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Calendar className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">
            {item.name}
            {item.lastFour && (
              <span className="ml-1.5 text-[11.5px] font-normal tabular-nums text-muted-foreground">
                •••• {item.lastFour}
              </span>
            )}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <Money
            amount={item.amount}
            className="block text-[14px] font-semibold tabular-nums text-foreground"
          />
          {item.prevAmount != null && (
            <MonthOverMonthDiff amount={item.amount} prevAmount={item.prevAmount} />
          )}
          <p className={cn("mt-0.5 text-[10.5px] font-semibold", toneClass)}>{text}</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={markPaid}
        disabled={isPending || justPaid}
        aria-label="Marcar período como pagado"
        className={cn(
          "mt-2 ml-12 inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors active:scale-95",
          justPaid
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Pago
      </button>
    </div>
  );
}
