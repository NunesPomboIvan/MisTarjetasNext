import type { CardType } from "@/lib/supabase/database.types";

/**
 * Comisión que cobra Mercado Pago al pagar con tarjeta de crédito (ej. una
 * transferencia): % por red de tarjeta. El comprobante muestra el importe sin
 * la comisión; en el alta se puede sumar con un tilde.
 */
export type MpCommissions = Partial<Record<CardType, number>>;

/** Redes que se pueden configurar en Ajustes. */
export const MP_COMMISSION_CARD_TYPES: CardType[] = [
  "visa",
  "mastercard",
  "amex",
  "naranja",
  "cabal",
];

/** Normaliza lo guardado en la base: sólo redes conocidas y % entre 0 y 100. */
export function parseMpCommissions(raw: unknown): MpCommissions {
  const out: MpCommissions = {};
  if (!raw || typeof raw !== "object") return out;
  for (const type of MP_COMMISSION_CARD_TYPES) {
    const value = Number((raw as Record<string, unknown>)[type]);
    if (Number.isFinite(value) && value > 0 && value < 100) out[type] = value;
  }
  return out;
}

/** Importe con la comisión sumada, redondeado a centavos. */
export function withCommission(amount: number, pct: number): number {
  return Math.round(amount * (1 + pct / 100) * 100) / 100;
}

/** "6,53%" */
export function formatPct(pct: number): string {
  return `${pct.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}
