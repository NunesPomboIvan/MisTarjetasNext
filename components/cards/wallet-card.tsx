import { Money } from "@/components/shared/money";
import { CardLogo } from "./card-logo";
import { cn } from "@/lib/utils";
import type { Card, Currency } from "@/lib/supabase/database.types";

interface WalletCardProps {
  card: Pick<Card, "id" | "name" | "type" | "last_four" | "color"> & {
    bank?: string | null;
  };
  total: number;
  currency?: Currency;
  hideBalance?: boolean;
  compact?: boolean;
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

function darken(hex: string, amount = 0.18): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  const dr = Math.max(0, Math.round(r * f));
  const dg = Math.max(0, Math.round(g * f));
  const db = Math.max(0, Math.round(b * f));
  return `rgb(${dr}, ${dg}, ${db})`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Visualización de tarjeta estilo Wallet — gradiente cálido + blobs decorativos.
 * Usa el color de la tarjeta como base; calcula el contraste del texto y un acento
 * decorativo automáticamente.
 */
export function WalletCard({
  card,
  total,
  currency = "ARS",
  hideBalance = false,
  compact = false,
  className,
}: WalletCardProps) {
  const baseColor = card.color || "#3B4F8A";
  const lum = relativeLuminance(baseColor);
  const isLight = lum > 0.55;
  const fg = isLight ? "#3A2818" : "#FFF4E0";
  const fgMuted = isLight
    ? "rgba(58, 40, 24, 0.7)"
    : "rgba(255, 244, 224, 0.75)";
  const decoColor = isLight ? "#8B5A2B" : "#F4B860";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden",
        "rounded-3xl",
        compact ? "p-5" : "p-[22px]",
        className
      )}
      style={{
        width: "100%",
        height: compact ? 174 : 200,
        background: `linear-gradient(140deg, ${baseColor} 0%, ${darken(baseColor, 0.2)} 100%)`,
        color: fg,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 14px 36px -10px ${baseColor}66`,
      }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -40,
          right: -30,
          width: 180,
          height: 180,
          borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
          background: decoColor,
          opacity: 0.25,
          filter: "blur(6px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: -50,
          left: -20,
          width: 140,
          height: 140,
          borderRadius: "50% 50% 60% 40% / 45% 55% 45% 55%",
          background: decoColor,
          opacity: 0.15,
          filter: "blur(8px)",
        }}
      />

      {/* Top: bank + name + brand */}
      <div className="relative flex items-start justify-between">
        <div>
          {card.bank && (
            <div
              className="text-[11px] font-semibold uppercase"
              style={{ color: fgMuted, letterSpacing: "0.13em" }}
            >
              {card.bank}
            </div>
          )}
          <div
            className="mt-1 font-display text-[17px] font-semibold"
            style={{ letterSpacing: "-0.01em" }}
          >
            {card.name}
          </div>
        </div>
        <CardLogo type={card.type} size="sm" />
      </div>

      {/* Bottom: período actual + monto + ultimos 4 */}
      <div className="relative">
        <div
          className="mb-1 text-[10px] font-semibold uppercase"
          style={{ color: fgMuted, letterSpacing: "0.16em" }}
        >
          Período actual
        </div>
        <div className="flex items-end justify-between gap-3">
          <Money
            amount={total}
            currency={currency}
            hide={hideBalance}
            className="font-display text-[28px] font-semibold tabular-nums"
            style={{ letterSpacing: "-0.02em", color: fg }}
          />
          <div
            className="text-[13px] tabular-nums"
            style={{ color: fgMuted, letterSpacing: "0.12em" }}
          >
            •••• {card.last_four}
          </div>
        </div>
      </div>
    </div>
  );
}
