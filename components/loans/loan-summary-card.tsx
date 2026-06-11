import { Calendar } from "lucide-react";
import { Money } from "@/components/shared/money";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Currency } from "@/lib/supabase/database.types";

interface LoanSummaryCardProps {
  bank: string | null;
  description: string;
  /** Color de identidad del préstamo (hex). Se usa SOLO en la franja izquierda. */
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
const CARD_RADIUS = 20;
const STRIP_WIDTH = 5;

/**
 * Resumen de un préstamo para el listado /prestamos.
 *
 * Sistema de color: el color de identidad del préstamo vive en un único
 * elemento — la franja vertical izquierda. El resto de la card usa colores
 * semánticos (verde de éxito, ámbar/rojo de alerta) o neutros, de forma que
 * las cards sean comparables de un vistazo y el color comunique estado real.
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
  const hasProgress = progressPct > 0;
  const hasPaid = paid > 0;
  const showDescription =
    !!bank && bank.trim().toLowerCase() !== description.trim().toLowerCase();

  // Estado semántico — no usa el color del préstamo
  const status = isComplete
    ? {
        label: "Cancelado",
        pill: "border-[#30D158]/40 bg-[#30D158]/15 text-[#30D158]",
        dot: "bg-[#30D158]",
      }
    : hasOverdue
      ? {
          label: "Vencido",
          pill: "border-red-500/35 bg-red-500/12 text-red-300",
          dot: "bg-red-400",
        }
      : {
          label: "Activo",
          pill: "border-white/12 bg-white/5 text-foreground/75",
          dot: "bg-foreground/55",
        };

  return (
    <article
      className={cn(
        "relative overflow-hidden border border-border bg-card py-5 pl-5 pr-4 shadow-sm",
        className
      )}
      style={{ borderRadius: CARD_RADIUS }}
    >
      {/* Franja de identidad — único lugar de la card con el color del préstamo */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{
          width: STRIP_WIDTH,
          background: accent,
          borderTopLeftRadius: CARD_RADIUS,
          borderBottomLeftRadius: CARD_RADIUS,
        }}
      />

      {/* TOP: nombre/descripción + pill de estado */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-bold leading-tight text-foreground">
            {bank || description}
          </p>
          {showDescription && (
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <span
          className={cn(
            "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            status.pill
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {/* MIDDLE: Pendiente / Pagado / Total */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Pendiente
          </p>
          <Money
            amount={pending}
            currency={currency}
            className={cn(
              "mt-1 block truncate text-[13.5px] font-bold leading-tight tabular-nums",
              hasOverdue ? "text-amber-300" : "text-foreground"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Pagado
          </p>
          <Money
            amount={paid}
            currency={currency}
            className={cn(
              "mt-1 block truncate text-[13.5px] font-bold leading-tight tabular-nums",
              hasPaid ? "text-[#30D158]" : "text-foreground"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <Money
            amount={total}
            currency={currency}
            className="mt-1 block truncate text-[13.5px] font-bold leading-tight tabular-nums text-foreground"
          />
        </div>
      </div>

      {/* PROGRESO: chip % + cuotas + barra */}
      <div className="mt-5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-6 flex-shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums",
              hasProgress
                ? "bg-[#30D158]/15 text-[#30D158]"
                : "bg-white/10 text-muted-foreground"
            )}
            style={{ minWidth: 40 }}
          >
            {progressPct}%
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {paidCount} de {totalCount} cuotas pagadas
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          {hasProgress && (
            <div
              className="h-full rounded-full bg-[#30D158] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          )}
        </div>
      </div>

      {/* BOTTOM: fecha de emisión */}
      <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          Emitido el{" "}
          {capitalize(
            formatDate(parseLocalDate(issueDate), "d 'de' MMM yyyy")
          )}
        </span>
      </div>
    </article>
  );
}
