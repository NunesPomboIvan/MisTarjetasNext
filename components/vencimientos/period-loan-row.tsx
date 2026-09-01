import Link from "next/link";
import { Banknote } from "lucide-react";
import { Money } from "@/components/shared/money";
import { formatLongDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import { PeriodStatusPill } from "./period-status-pill";
import type { PeriodDetailLoan } from "@/lib/vencimientos";

/** Fila de préstamo en el detalle de período (solo lectura). */
export function PeriodLoanRow({ item }: { item: PeriodDetailLoan }) {
  const accent = item.accent || "#6366f1";

  return (
    <Link
      href={`/prestamos/${item.loanId}`}
      className="flex items-center gap-3 rounded-[14px] border border-border bg-background/40 px-3 py-2.5 transition-colors active:opacity-70"
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}20`, color: accent }}
      >
        <Banknote className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-foreground">
          {item.name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Cuota {item.installmentNumber} de {item.totalInstallments} · Vence{" "}
          {formatLongDate(parseLocalDate(item.dueDateKey))}
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <Money
          amount={item.amount}
          className="block text-[14px] font-semibold tabular-nums text-foreground"
        />
        <PeriodStatusPill status={item.status} />
      </div>
    </Link>
  );
}
