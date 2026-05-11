"use client";

import { Money } from "@/components/shared/money";

interface CategoryItem {
  name: string;
  emoji: string;
  color: string;
  amount: number;
}

interface CategoryDonutProps {
  categories: CategoryItem[];
  total: number;
  size?: number;
}

export function CategoryDonut({ categories, total, size = 160 }: CategoryDonutProps) {
  if (total === 0 || categories.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
        Sin datos
      </div>
    );
  }

  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let cumulative = 0;
  const segments = categories.map((cat) => {
    const fraction = cat.amount / total;
    const dash = fraction * c;
    const offset = -((cumulative * c) - c * 0.25);
    cumulative += fraction;
    return { cat, dash, offset };
  });

  return (
    <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="var(--muted)"
            strokeWidth={14}
            fill="none"
          />
          {segments.map(({ cat, dash, offset }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              stroke={cat.color}
              strokeWidth={14}
              fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Money
            amount={total}
            className="font-display text-[18px] font-bold leading-none text-foreground"
          />
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full flex-1 space-y-2">
        {categories.slice(0, 6).map((cat, i) => {
          const pct = Math.round((cat.amount / total) * 100);
          return (
            <div key={i} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <span className="flex-1 truncate text-[12.5px] font-medium text-foreground">
                {cat.name}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {pct}%
              </span>
              <Money
                amount={cat.amount}
                className="text-[12px] font-semibold tabular-nums text-foreground"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
