import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Money } from "@/components/shared/money";
import { differenceInCalendarDays } from "date-fns";
import { formatDate, nowInArgentina } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import { CARD_TYPE_LABEL } from "@/lib/cards/card-type-label";
import { PeriodPaidToggle } from "./period-paid-toggle";
import type { PeriodDetailCard } from "@/lib/vencimientos";

/**
 * Fila de tarjeta en el detalle de período. El cuerpo navega al detalle de la
 * tarjeta posicionado en ESTE período (via ?offset); el pill de estado togglea
 * el pago del período sin salir de la pantalla.
 */
/**
 * "Cierra en 5 días (24/09/2026)" / "Vence hoy (02/10/2026)" /
 * "Venció hace 2 días (02/10/2026)".
 */
export function relativeDateLabel(
  verbs: { future: string; past: string },
  dateKey: string,
  today: Date
): string {
  const d = parseLocalDate(dateKey);
  const days = differenceInCalendarDays(d, today);
  const n = Math.abs(days);
  const amount = `${n} ${n === 1 ? "día" : "días"}`;
  const rel =
    days === 0
      ? `${verbs.future} hoy`
      : days > 0
        ? `${verbs.future} en ${amount}`
        : `${verbs.past} hace ${amount}`;
  return `${rel} (${formatDate(d, "dd/MM/yyyy")})`;
}

export function PeriodCardRow({
  item,
  showDates = true,
  hidePaidAmount = false,
}: {
  item: PeriodDetailCard;
  /** false en períodos futuros: sus fechas de cierre/vencimiento no se conocen. */
  showDates?: boolean;
  /** true en el Resumen (período actual): lo ya pagado no muestra su importe. */
  hidePaidAmount?: boolean;
}) {
  const accent = item.accent || "#6366f1";
  const today = nowInArgentina();
  // Igual que en la home: "Macro · Visa 4016" (banco · red + últimos 4).
  const brandAndNumber = [CARD_TYPE_LABEL[item.cardType], item.lastFour]
    .filter(Boolean)
    .join(" ");
  const href =
    item.offset === 0
      ? `/cards/${item.cardId}`
      : `/cards/${item.cardId}?offset=${item.offset}`;

  return (
    <div className="flex items-center gap-3 py-3.5">
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
            {brandAndNumber && (
              <span className="ml-1.5 text-[11.5px] font-normal tabular-nums text-muted-foreground">
                · {brandAndNumber}
              </span>
            )}
          </p>
          {showDates && (
            <>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {relativeDateLabel({ future: "Cierra", past: "Cerró" }, item.closeDateKey, today)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {relativeDateLabel({ future: "Vence", past: "Venció" }, item.dueDateKey, today)}
              </p>
            </>
          )}
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
          kind="card"
          cardId={item.cardId}
          periodKey={item.periodKey}
          status={item.status}
        />
      </div>
    </div>
  );
}
