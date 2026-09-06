import { Calendar } from "lucide-react";
import { Money } from "@/components/shared/money";
import { cn, formatLongDate } from "@/lib/utils";
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
 * Sistema de color: el color de identidad del préstamo vive en dos lugares —
 * la franja vertical izquierda y el fill de la barra de progreso. Verde,
 * ámbar y rojo quedan reservados para el estado del préstamo (al día / por
 * vencer / en mora); nunca se usan para el saldo pendiente, que es una deuda
 * normal, no un error. La jerarquía tipográfica hace que PENDIENTE —el dato
 * que se viene a buscar— sea el protagonista.
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
      {/* Franja de identidad — color del préstamo (también en el fill de la barra) */}
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

      {/* PENDIENTE: dato protagonista — fila propia */}
      <div className="mt-5 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#7A8089]">
          Pendiente
        </p>
        <Money
          amount={pending}
          currency={currency}
          style={{ fontWeight: 600 }}
          className="mt-1 block truncate text-[26px] leading-tight tabular-nums text-white"
        />
      </div>

      {/* PAGADO / TOTAL: fila secundaria de contexto */}
      <div className="mt-3 flex items-baseline gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#7A8089]">
            Pagado
          </p>
          <Money
            amount={paid}
            currency={currency}
            style={{ fontWeight: 400 }}
            className="mt-0.5 block truncate text-[16px] leading-tight tabular-nums text-[#4ADE80]"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#7A8089]">
            Total
          </p>
          <Money
            amount={total}
            currency={currency}
            style={{ fontWeight: 400 }}
            className="mt-0.5 block truncate text-[16px] leading-tight tabular-nums text-[#7A8089]"
          />
        </div>
      </div>

      {/* PROGRESO: cuotas (izq) + % (der) sobre la barra */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="text-[#7A8089]">
            {paidCount} de {totalCount} cuotas
          </span>
          <span className="tabular-nums text-white">{progressPct}%</span>
        </div>
        <div
          className="mt-2 overflow-hidden rounded-full"
          style={{ height: 6, background: "rgba(255,255,255,0.08)" }}
        >
          {hasProgress && (
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: accent }}
            />
          )}
        </div>
      </div>

      {/* BOTTOM: fecha de emisión */}
      <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          Emitido el {formatLongDate(parseLocalDate(issueDate), true)}
        </span>
      </div>
    </article>
  );
}
