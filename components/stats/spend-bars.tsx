"use client";

interface BarPoint {
  key: string;
  label: string;
  amount: number;
}

interface SpendBarsProps {
  data: BarPoint[];
}

function compact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/**
 * Barras verticales de gasto real por período (día o mes). Reemplaza a la
 * curva acumulada: cada barra es lo gastado en ese tramo, fácil de comparar.
 */
export function SpendBars({ data }: SpendBarsProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
        Sin datos
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.amount), 1);
  const maxIdx = data.reduce(
    (best, d, i) => (d.amount > data[best].amount ? i : best),
    0
  );
  const showAllLabels = data.length <= 8;

  return (
    <div className="mt-2">
      <div className="flex h-40 items-end gap-1.5">
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.amount / max) * 100));
          const highlight = i === maxIdx;
          return (
            <div
              key={d.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              {(showAllLabels || highlight) && (
                <span
                  className={
                    "text-[9.5px] font-semibold tabular-nums " +
                    (highlight ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {compact(d.amount)}
                </span>
              )}
              <div
                className="w-full rounded-t-[4px] transition-all"
                style={{
                  height: `${h}%`,
                  background: highlight
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <span
            key={d.key}
            className={
              "min-w-0 flex-1 truncate text-center text-[9.5px] " +
              (i === maxIdx
                ? "font-semibold text-foreground"
                : "text-muted-foreground")
            }
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
