import { Banknote } from "lucide-react";
import { Money } from "@/components/shared/money";
import { capitalize, cn, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Currency } from "@/lib/supabase/database.types";

interface LoanCardProps {
  bank: string | null;
  description: string;
  color: string;
  currency?: Currency;
  pending: number;
  total: number;
  paidCount: number;
  totalCount: number;
  /** Cuota siguiente: número y monto + fecha (YYYY-MM-DD) */
  next?: {
    number: number;
    amount: number;
    due_date: string;
  } | null;
  className?: string;
}

/**
 * Card de préstamo con estética de "resumen bancario": fondo del card,
 * pastilla coloreada del banco y sección destacada del pendiente.
 * Distinta a WalletCard a propósito — no parece tarjeta de crédito.
 */
export function LoanCard({
  bank,
  description,
  color,
  currency = "ARS",
  pending,
  total,
  paidCount,
  totalCount,
  next,
  className,
}: LoanCardProps) {
  const accent = color || "#6366f1";
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const isComplete = paidCount === totalCount && totalCount > 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-border bg-card shadow-sm",
        className
      )}
    >
      {/* Banda lateral de color: marca de identidad del préstamo */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: accent }}
      />

      {/* Tinte suave de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accent}14 0%, transparent 55%)`,
        }}
      />

      <div className="relative px-5 py-4 pl-6">
        {/* Header: ícono + banco/descripción */}
        <header className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `${accent}22`, color: accent }}
          >
            <Banknote className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate font-display text-[16px] font-bold leading-tight text-foreground">
              {bank || description}
            </p>
            {bank && bank.trim().toLowerCase() !== description.trim().toLowerCase() && (
              <p className="truncate text-[12px] text-muted-foreground">
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
        </header>

        {/* Pendiente destacado + total al lado */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Saldo pendiente
            </p>
            <Money
              amount={pending}
              currency={currency}
              className="mt-1 block font-display text-[24px] font-bold leading-none tabular-nums text-foreground"
            />
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              de
            </p>
            <Money
              amount={total}
              currency={currency}
              className="mt-1 block text-[13px] font-semibold tabular-nums text-muted-foreground"
            />
          </div>
        </div>

        {/* Progreso de cuotas */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground tabular-nums">
              {paidCount}/{totalCount} cuotas
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

        {/* Próxima cuota */}
        {next && (
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11.5px]">
            <span className="text-muted-foreground">
              Próxima:{" "}
              <span className="font-semibold text-foreground">
                Cuota {next.number}
              </span>{" "}
              · {capitalize(formatDate(parseLocalDate(next.due_date), "d 'de' MMM"))}
            </span>
            <Money
              amount={next.amount}
              currency={currency}
              className="font-semibold tabular-nums text-foreground"
            />
          </div>
        )}
      </div>
    </article>
  );
}
