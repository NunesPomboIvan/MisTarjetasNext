import type { Card, CardType } from "@/lib/supabase/database.types";

/** Nombre legible de la red de la tarjeta ("other" no se muestra). */
export const CARD_TYPE_LABEL: Record<CardType, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  naranja: "Naranja",
  cabal: "Cabal",
  other: "",
};

/** "Visa · Macro 4016": red, separador, nombre y últimos 4 dígitos. */
export function cardLabel(card: Pick<Card, "type" | "name" | "last_four">): string {
  const rest = [card.name, card.last_four].filter(Boolean).join(" ");
  return [CARD_TYPE_LABEL[card.type], rest].filter(Boolean).join(" · ");
}
