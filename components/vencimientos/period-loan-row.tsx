import Link from "next/link";
import { Banknote } from "lucide-react";
import { Money } from "@/components/shared/money";
import { nowInArgentina } from "@/lib/utils";
import { PeriodPaidToggle } from "./period-paid-toggle";
import { relativeDateLabel } from "./period-card-row";
import type { PeriodDetailLoan } from "@/lib/vencimientos";

/**
 * Fila de préstamo en el detalle de período. El cuerpo navega al préstamo; el
 * pill de estado togglea el pago de la cuota sin salir de la pantalla.
 */
export function PeriodLoanRow({
  item,
  hidePaidAmount = false,
}: {
  item: PeriodDetailLoan;
  /** true en el Resumen (período actual): lo ya pagado no muestra su importe. */
  hidePaidAmount?: boolean;
}) {
  const accent = item.accent || "#6366f1";

  return (
    <div className="flex items-center gap-3 py-3.5">
      <Link
        href={`/prestamos/${item.loanId}`}
        className="flex min-w-0 flex-1 items-center gap-3 transition-colors active:opacity-70"
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
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            Cuota: {item.installmentNumber}/{item.totalInstallments}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {relativeDateLabel({ future: "Vence", past: "Venció" }, item.dueDateKey, nowInArgentina())}
          </p>
        </div>
      </Link>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {!(hidePaidAmount && item.status === "paid") && (
          <Money
            amount={item.amount}
            className="block text-[14px] font-semibold tabular-nums text-foreground"
          />
        )}
        <PeriodPaidToggle
          kind="loan"
          installmentId={item.installmentId}
          status={item.status}
        />
      </div>
    </div>
  );
}
