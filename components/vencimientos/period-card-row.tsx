import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Money } from "@/components/shared/money";
import { formatLongDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import { PeriodPaidToggle } from "./period-paid-toggle";
import type { PeriodDetailCard } from "@/lib/vencimientos";

/**
 * Fila de tarjeta en el detalle de período. El cuerpo navega al detalle de la
 * tarjeta posicionado en ESTE período (via ?offset); el pill de estado togglea
 * el pago del período sin salir de la pantalla.
 */
export function PeriodCardRow({ item }: { item: PeriodDetailCard }) {
  const accent = item.accent || "#6366f1";
  const href =
    item.offset === 0
      ? `/cards/${item.cardId}`
      : `/cards/${item.cardId}?offset=${item.offset}`;

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-background/40 px-3 py-2.5">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 transition-colors active:opacity-70"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          <CreditCard className="h-4 w-4" />
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
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cierre {formatLongDate(parseLocalDate(item.closeDateKey))} · Vence{" "}
            {formatLongDate(parseLocalDate(item.dueDateKey))}
          </p>
        </div>
      </Link>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <Money
          amount={item.amount}
          className="block text-[14px] font-semibold tabular-nums text-foreground"
        />
        <PeriodPaidToggle
          kind="card"
          cardId={item.cardId}
          periodKey={item.periodKey}
          status={item.status}
        />
      </div>
    </div>
  );
}
