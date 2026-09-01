import { cn } from "@/lib/utils";
import type { PeriodItemStatus } from "@/lib/vencimientos";

const STYLES: Record<PeriodItemStatus, { label: string; className: string }> = {
  paid: {
    label: "Pagado",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  overdue: {
    label: "Vencido",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  pending: {
    label: "Pendiente",
    className: "border-border bg-transparent text-muted-foreground",
  },
};

/** Pill de estado de un ítem del período: pagado / vencido / pendiente. */
export function PeriodStatusPill({ status }: { status: PeriodItemStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        s.className
      )}
    >
      {s.label}
    </span>
  );
}
