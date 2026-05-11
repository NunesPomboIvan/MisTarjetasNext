import { Money } from "@/components/shared/money";
import { CardLogo } from "./card-logo";
import { cn } from "@/lib/utils";
import type { Card, Currency } from "@/lib/supabase/database.types";

interface WalletCardProps {
  card: Pick<
    Card,
    "id" | "name" | "type" | "last_four" | "color" | "bank" | "is_extension"
  >;
  /** Total del período. Si se pasa, se renderiza el strip "Período actual" + monto */
  total?: number;
  currency?: Currency;
  hideBalance?: boolean;
  compact?: boolean;
  className?: string;
  /** Fecha de cierre formateada, ej: "23 may" */
  closeLabel?: string;
  /** Fecha de vencimiento formateada, ej: "10 jun" */
  dueLabel?: string;
}

/* ─── Color utilities ─────────────────────────────────────── */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function tint(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/* ─── WalletCard ──────────────────────────────────────────── */

export function WalletCard({
  card,
  total,
  currency = "ARS",
  hideBalance = false,
  compact = false,
  className,
  closeLabel,
  dueLabel,
}: WalletCardProps) {
  const base = card.color || "#6366f1";
  const lum = relativeLuminance(base);
  const isLight = lum > 0.45;

  const fg = isLight ? "rgba(18,10,4,0.93)" : "rgba(255,252,245,0.95)";
  const fgMuted = isLight ? "rgba(18,10,4,0.52)" : "rgba(255,252,245,0.58)";

  /* Gradiente 3 paradas — profundidad real */
  const g0 = tint(base, 0.28);
  const g1 = base;
  const g2 = shade(base, 0.42);

  /* Sombra coloreada */
  const shadowHex = shade(base, 0.1);
  const { r, g, b } = hexToRgb(shadowHex);

  const cardH = compact ? 172 : 204;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-[24px]",
        compact ? "p-5" : "p-[22px]",
        className
      )}
      style={{
        width: "100%",
        height: cardH,
        background: `linear-gradient(145deg, ${g0} 0%, ${g1} 48%, ${g2} 100%)`,
        color: fg,
        boxShadow: [
          "0 1px 0 rgba(255,255,255,0.18) inset",
          "0 -1px 0 rgba(0,0,0,0.18) inset",
          "0 1px 3px rgba(0,0,0,0.14)",
          `0 12px 40px -8px rgba(${r},${g},${b},0.60)`,
          "0 4px 16px -4px rgba(0,0,0,0.22)",
        ].join(", "),
      }}
    >
      {/* Shine diagonal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[24px]"
        style={{
          background:
            "linear-gradient(132deg, rgba(255,255,255,0.19) 0%, rgba(255,255,255,0.05) 40%, transparent 62%)",
        }}
      />

      {/* Glow radial top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -60,
          right: -50,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tint(base, 0.45)} 0%, transparent 65%)`,
          opacity: 0.35,
          filter: "blur(2px)",
        }}
      />

      {/* Glow radial bottom-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: -50,
          left: -30,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${shade(base, 0.55)} 0%, transparent 65%)`,
          opacity: 0.5,
          filter: "blur(4px)",
        }}
      />

      {/* Arco decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "-30%",
          right: "-18%",
          width: "70%",
          height: "160%",
          borderRadius: "50%",
          border: `1px solid rgba(255,255,255,${isLight ? "0.12" : "0.10"})`,
        }}
      />

      {/* TOP: nombre (izq) + logo de red (der) */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          {card.bank && (
            <div
              className="mb-0.5 text-[10px] font-bold uppercase"
              style={{ color: fgMuted, letterSpacing: "0.15em" }}
            >
              {card.bank}
            </div>
          )}
          <div
            className="font-display text-[17px] font-semibold leading-tight"
            style={{ letterSpacing: "-0.015em", color: fg }}
          >
            {card.name}
          </div>
          {card.is_extension && (
            <div
              className="mt-1 inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{
                background: `rgba(255,255,255,${isLight ? "0.22" : "0.15"})`,
                color: fgMuted,
                letterSpacing: "0.14em",
                backdropFilter: "blur(4px)",
              }}
            >
              Adicional
            </div>
          )}
        </div>

        <CardLogo type={card.type} size={compact ? "sm" : "md"} fgColor={fg} />
      </div>

      {/* BOTTOM: fechas + período + número */}
      <div className="relative space-y-2">
        {(closeLabel || dueLabel) && (
          <div className="flex items-center gap-3">
            {closeLabel && (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[8.5px] font-bold uppercase"
                  style={{ color: fgMuted, letterSpacing: "0.16em" }}
                >
                  Cierre
                </span>
                <span
                  className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{
                    background: `rgba(255,255,255,${isLight ? "0.18" : "0.13"})`,
                    color: fg,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {closeLabel}
                </span>
              </div>
            )}
            {closeLabel && dueLabel && (
              <span style={{ color: fgMuted, opacity: 0.35, fontSize: 10 }}>|</span>
            )}
            {dueLabel && (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[8.5px] font-bold uppercase"
                  style={{ color: fgMuted, letterSpacing: "0.16em" }}
                >
                  Vence
                </span>
                <span
                  className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{
                    background: `rgba(255,255,255,${isLight ? "0.18" : "0.13"})`,
                    color: fg,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {dueLabel}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Separador sutil */}
        <div
          style={{
            height: 1,
            background: `rgba(255,255,255,${isLight ? "0.22" : "0.12"})`,
          }}
        />

        {/* Período + monto + número */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <div
              className="mb-1 text-[9.5px] font-semibold uppercase"
              style={{ color: fgMuted, letterSpacing: "0.18em" }}
            >
              Período actual
            </div>
            {total != null ? (
              <Money
                amount={total}
                currency={currency}
                hide={hideBalance}
                className="font-display text-[26px] font-bold tabular-nums leading-none"
                style={{ letterSpacing: "-0.025em", color: fg }}
              />
            ) : (
              <span
                className="font-display text-[26px] font-bold leading-none"
                style={{ letterSpacing: "-0.025em", color: fg }}
              >
                ·····
              </span>
            )}
          </div>
          <div
            className="mb-0.5 text-[13px] tabular-nums"
            style={{ color: fgMuted, letterSpacing: "0.14em" }}
          >
            •••• {card.last_four}
          </div>
        </div>
      </div>
    </div>
  );
}
