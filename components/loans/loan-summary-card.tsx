import { Money } from "@/components/shared/money";
import { FIELD_CARD, FIELD_LABEL } from "@/components/shared/field-styles";
import { cn, formatLongDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Currency } from "@/lib/supabase/database.types";

interface LoanSummaryCardProps {
  bank: string | null;
  description: string;
  /** Color de identidad del préstamo (hex): punto del título y barra de progreso. */
  color: string;
  currency?: Currency;
  pending: number;
  paid: number;
  total: number;
  paidCount: number;
  totalCount: number;
  /** Cuotas no pagadas con vencimiento ya pasado. Activa estado "Vencido". */
  overdueCount?: number;
  /** Fecha de emisión del préstamo (YYYY-MM-DD) */
  issueDate: string;
  className?: string;
}

const ACCENT_FALLBACK = "#6366f1";

/**
 * Resumen compacto de un préstamo para el listado /prestamos, con el formato
 * de los items de las pantallas de alta: sólo borde, sin relleno, letra chica
 * en negrita.
 *
 * Sistema de color: el color de identidad del préstamo vive en dos lugares —
 * el punto junto al nombre y el fill de la barra de progreso. Verde y rojo
 * quedan reservados para el estado del préstamo (cancelado / en mora) y lo
 * pagado; nunca se usan para el saldo pendiente, que es una deuda normal, no
 * un error. PENDIENTE —el dato que se viene a buscar— es el protagonista.
 */
export function LoanSummaryCard({
  bank,
  description,
  color,
  currency = "ARS",
  pending,
  paid,
  total,
  paidCount,
  totalCount,
  overdueCount = 0,
  issueDate,
  className,
}: LoanSummaryCardProps) {
  const accent = color || ACCENT_FALLBACK;
  const progressPct =
    totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const isComplete = paidCount === totalCount && totalCount > 0;
  const hasOverdue = !isComplete && overdueCount > 0;
  const showDescription =
    !!bank && bank.trim().toLowerCase() !== description.trim().toLowerCase();

  // Estado semántico — no usa el color del préstamo
  const status = isComplete
    ? { label: "Cancelado", pill: "border-[#30D158]/40 bg-[#30D158]/15 text-[#30D158]" }
    : hasOverdue
      ? { label: "Vencido", pill: "border-red-500/35 bg-red-500/12 text-red-300" }
      : { label: "Activo", pill: "border-border text-muted-foreground" };

  return (
    <article className={cn(FIELD_CARD, "px-3 py-2.5", className)}>
      {/* Nombre + estado */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-foreground">
          {bank || description}
        </p>
        <span
          className={cn(
            "flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-tight",
            status.pill
          )}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {showDescription && `${description} · `}
        Emitido el {formatLongDate(parseLocalDate(issueDate), true)}
      </p>

      {/* Pendiente (protagonista) + pagado / total */}
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={FIELD_LABEL}>Pendiente</p>
          <Money
            amount={pending}
            currency={currency}
            className="block truncate text-[18px] font-semibold leading-tight tabular-nums text-foreground"
          />
        </div>
        <dl className="grid flex-shrink-0 grid-cols-[auto_auto] items-baseline gap-x-2 text-right text-[11px] font-semibold leading-snug">
          <dt className="text-left text-muted-foreground">Pagado</dt>
          <dd>
            <Money amount={paid} currency={currency} className="tabular-nums text-[#4ADE80]" />
          </dd>
          <dt className="text-left text-muted-foreground">Total</dt>
          <dd>
            <Money amount={total} currency={currency} className="tabular-nums text-muted-foreground" />
          </dd>
        </dl>
      </div>

      {/* Progreso: barra + cuotas y % */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/10">
          {progressPct > 0 && (
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: accent }}
            />
          )}
        </div>
        <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {paidCount} de {totalCount} cuotas · {progressPct}%
        </span>
      </div>
    </article>
  );
}
