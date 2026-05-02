import { formatDate } from "@/lib/utils";
import type { Period } from "@/lib/periods/calculate";

interface PeriodProgressProps {
  period: Period;
  /** Color de la barra (hex/oklch) — por defecto el primario del tema */
  color?: string;
  /**
   * Momento de referencia para calcular el avance. Pasarlo desde un Server
   * Component evita que el Compilador de React marque `Date.now()` como impuro.
   */
  now: Date;
}

/**
 * Barra de progreso del período facturable: muestra dónde estamos
 * entre el inicio del período y el cierre, junto con cierre/vencimiento.
 */
export function PeriodProgress({ period, color, now }: PeriodProgressProps) {
  const total = period.end.getTime() - period.start.getTime();
  const elapsed = Math.max(
    0,
    Math.min(total, now.getTime() - period.start.getTime())
  );
  const pct = total > 0 ? (elapsed / total) * 100 : 0;
  const fillColor = color || "var(--primary)";

  return (
    <div className="rounded-[22px] border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Período en curso
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatDate(period.start, "d MMM")} – {formatDate(period.end, "d MMM")}
        </p>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
      <div className="mt-4 flex justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Cierre
          </p>
          <p className="mt-1 text-[15px] font-semibold text-foreground">
            {formatDate(period.end, "d MMM")}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Vencimiento
          </p>
          <p className="mt-1 text-[15px] font-semibold text-foreground">
            {formatDate(period.due, "d MMM")}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Avance
          </p>
          <p
            className="mt-1 text-[15px] font-semibold"
            style={{ color: fillColor }}
          >
            {Math.round(pct)}%
          </p>
        </div>
      </div>
    </div>
  );
}
