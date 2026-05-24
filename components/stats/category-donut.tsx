"use client";

import { Money } from "@/components/shared/money";

interface CategoryItem {
  name: string;
  emoji: string;
  color: string;
  amount: number;
}

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  total: number;
}

// Paleta vívida con buen contraste entre segmentos contiguos.
const VIVID_PALETTE = [
  "#ef4444", // rojo
  "#f97316", // naranja
  "#eab308", // amarillo
  "#22c55e", // verde
  "#06b6d4", // cian
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#14b8a6", // teal
  "#6366f1", // índigo
  "#f43f5e", // rose
  "#84cc16", // lime
];

function paletteColor(i: number) {
  return VIVID_PALETTE[i % VIVID_PALETTE.length];
}

export function CategoryDonut({ categories, total }: CategoryBreakdownProps) {
  if (total === 0 || categories.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[13px] text-muted-foreground">
        Sin datos
      </div>
    );
  }

  // Pre-cómputo de % y color para segmentos
  const enriched = categories.map((cat, i) => ({
    ...cat,
    pct: (cat.amount / total) * 100,
    color: paletteColor(i),
  }));

  const topCount = 8;
  const top = enriched.slice(0, topCount);
  const rest = enriched.slice(topCount);
  const restAmount = rest.reduce((s, c) => s + c.amount, 0);
  const restPct = (restAmount / total) * 100;

  // Para la barra apilada, agrupar el resto en un segmento gris
  const stacked = [
    ...top.map((c) => ({ pct: c.pct, color: c.color, label: c.name })),
    ...(rest.length > 0
      ? [{ pct: restPct, color: "#64748b", label: `Otros (${rest.length})` }]
      : []),
  ];

  return (
    <div className="mt-4 space-y-5">
      {/* Barra apilada con todos los segmentos */}
      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40 ring-1 ring-border/40">
          {stacked.map((seg, i) => (
            <div
              key={i}
              className="h-full transition-all"
              style={{
                width: `${seg.pct}%`,
                background: seg.color,
                boxShadow:
                  i > 0 ? "inset 1px 0 0 rgba(255,255,255,0.18)" : undefined,
              }}
              title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{enriched.length} categoría{enriched.length === 1 ? "" : "s"}</span>
          <span>100%</span>
        </div>
      </div>

      {/* Ranking con mini barras */}
      <ul className="space-y-3">
        {top.map((cat, i) => (
          <li key={i} className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[14px]"
                style={{
                  background: `${cat.color}1f`,
                  boxShadow: `inset 0 0 0 1px ${cat.color}33`,
                }}
              >
                {cat.emoji}
              </span>
              <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                {cat.name}
              </span>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: cat.color }}
              >
                {cat.pct.toFixed(cat.pct < 10 ? 1 : 0)}%
              </span>
              <Money
                amount={cat.amount}
                className="w-[88px] text-right text-[12.5px] font-semibold tabular-nums text-foreground"
              />
            </div>
            <div className="ml-[42px] h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${cat.pct}%`,
                  background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}cc 100%)`,
                }}
              />
            </div>
          </li>
        ))}

        {rest.length > 0 && (
          <li className="flex items-center gap-2.5 pt-1">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-muted/60 text-[14px] text-muted-foreground">
              …
            </span>
            <span className="flex-1 truncate text-[13px] font-medium text-muted-foreground">
              Otras ({rest.length})
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              {restPct.toFixed(restPct < 10 ? 1 : 0)}%
            </span>
            <Money
              amount={restAmount}
              className="w-[88px] text-right text-[12.5px] font-semibold tabular-nums text-muted-foreground"
            />
          </li>
        )}
      </ul>
    </div>
  );
}
