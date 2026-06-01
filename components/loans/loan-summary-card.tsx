import { Money } from "@/components/shared/money";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Currency } from "@/lib/supabase/database.types";

interface LoanSummaryCardProps {
  bank: string | null;
  description: string;
  color: string;
  currency?: Currency;
  pending: number;
  paid: number;
  total: number;
  paidCount: number;
  totalCount: number;
  /** Fecha de emisión del préstamo (YYYY-MM-DD) */
  issueDate: string;
  className?: string;
}

/**
 * Resumen rico de un préstamo. Usado tanto en el listado /prestamos como
 * en el header del detalle /prestamos/[id], para mantener un único objeto
 * visual del préstamo en toda la app.
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
  issueDate,
  className,
}: LoanSummaryCardProps) {
  const accent = color || "#6366f1";
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const isComplete = paidCount === totalCount && totalCount > 0;
  const showDescription =
    !!bank && bank.trim().toLowerCase() !== description.trim().toLowerCase();

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="truncate font-display text-[17px] font-bold leading-tight"
            style={{
              color: accent,
              textShadow:
                "0 1px 2px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.65)",
            }}
          >
            {bank || description}
          </p>
          {showDescription && (
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground/70">Descripción:</span>{" "}
              {description}
            </p>
          )}
        </div>
        {isComplete && (
          <span
            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ background: "#10b98122", color: "#10b981" }}
          >
            Cancelado
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium text-muted-foreground">Pendiente</p>
          <Money
            amount={pending}
            currency={currency}
            className="mt-1 block text-[14px] font-bold leading-tight tabular-nums text-foreground"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium text-muted-foreground">Pagado</p>
          <Money
            amount={paid}
            currency={currency}
            className="mt-1 block text-[14px] font-bold leading-tight tabular-nums"
            style={{ color: "#10b981" }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium text-muted-foreground">Total</p>
          <Money
            amount={total}
            currency={currency}
            className="mt-1 block text-[14px] font-bold leading-tight tabular-nums text-foreground"
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {paidCount} de {totalCount} cuotas pagadas
          </span>
          <span className="font-semibold tabular-nums" style={{ color: accent }}>
            {progressPct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: accent }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Emitido el {capitalize(formatDate(parseLocalDate(issueDate), "d 'de' MMM yyyy"))}
      </p>
    </article>
  );
}
