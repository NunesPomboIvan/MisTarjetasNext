import Link from "next/link";
import { CardLogo } from "./card-logo";
import { Money } from "@/components/shared/money";
import type { Card } from "@/lib/supabase/database.types";

interface CompactCardRowProps {
  card: Pick<Card, "id" | "name" | "type" | "last_four" | "color" | "bank" | "is_extension" | "credit_limit">;
  /** Saldo / total del período */
  balance: number;
  /** Link a navegar */
  href?: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}
function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

export function CompactCardRow({ card, balance, href }: CompactCardRowProps) {
  const base = card.color || "#6366f1";
  const dark = shade(base, 0.30);

  const inner = (
    <div className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-3 transition-all active:scale-[0.985] hover:border-primary/40">
      {/* Mini card visual */}
      <div
        className="flex h-[58px] w-[88px] flex-shrink-0 flex-col items-start justify-between rounded-[10px] p-2 text-white"
        style={{
          background: `linear-gradient(135deg, ${base} 0%, ${dark} 100%)`,
        }}
      >
        <CardLogo type={card.type} size="sm" fgColor="#ffffff" />
        <span
          className="text-[9px] font-bold tabular-nums tracking-[0.06em]"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          •••• {card.last_four}
        </span>
      </div>

      {/* Info izquierda */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">
          {card.name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {card.bank ?? (card.is_extension ? "Adicional" : "Tarjeta")}
        </p>
      </div>

      {/* Monto + límite a la derecha */}
      <div className="flex-shrink-0 text-right">
        <Money
          amount={balance}
          className="block text-[15px] font-semibold tabular-nums text-foreground"
        />
        {card.credit_limit != null && card.credit_limit > 0 ? (
          <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
            Límite: <Money amount={card.credit_limit} className="text-[10.5px]" />
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
