import { Banknote, Calendar } from "lucide-react";
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
        "relative overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      {/* Halo sutil del color de acento, arriba a la derecha */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle, ${rgba(accent, 0.18)} 0%, transparent 65%)`,
          filter: "blur(8px)",
        }}
      />

      {/* TOP: avatar + nombre/descripción + pill estado */}
      <div className="relative flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${rgba(accent, 0.95)} 0%, ${rgba(accent, 0.75)} 100%)`,
            boxShadow: `0 6px 14px -6px ${rgba(accent, 0.55)}`,
          }}
        >
          <Banknote className="h-6 w-6 text-white" strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate font-display text-[17px] font-bold leading-tight text-foreground"
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

        <span
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: rgba(accent, 0.1),
            borderColor: rgba(accent, 0.3),
            color: accent,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          {isComplete ? "Cancelado" : "Activo"}
        </span>
      </div>

      {/* MIDDLE: 3 columnas Pendiente / Pagado / Total */}
      <div className="relative mt-5 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            Pendiente
          </p>
          <Money
            amount={pending}
            currency={currency}
            className="mt-1 block text-[15px] font-bold leading-tight tabular-nums text-foreground"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            Pagado
          </p>
          <Money
            amount={paid}
            currency={currency}
            className="mt-1 block text-[15px] font-bold leading-tight tabular-nums"
            style={{ color: accent }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <Money
            amount={total}
            currency={currency}
            className="mt-1 block text-[15px] font-bold leading-tight tabular-nums text-foreground"
          />
        </div>
      </div>

      {/* PROGRESS: pill % + cuotas + barra */}
      <div className="relative mt-5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-6 flex-shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums"
            style={{
              background: rgba(accent, 0.14),
              color: accent,
              minWidth: 40,
            }}
          >
            {progressPct}%
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {paidCount} de {totalCount} cuotas pagadas
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full"
          style={{ background: rgba(accent, 0.12) }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${accent} 0%, ${rgba(accent, 0.85)} 100%)`,
            }}
          />
        </div>
      </div>

      {/* BOTTOM: fecha de emisión */}
      <div className="relative mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          Emitido el {capitalize(formatDate(parseLocalDate(issueDate), "d 'de' MMM yyyy"))}
        </span>
      </div>
    </article>
  );
}
