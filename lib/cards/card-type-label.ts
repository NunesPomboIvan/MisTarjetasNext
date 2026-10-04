import type { CardType } from "@/lib/supabase/database.types";

/** Nombre legible de la red de la tarjeta ("other" no se muestra). */
export const CARD_TYPE_LABEL: Record<CardType, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  naranja: "Naranja",
  cabal: "Cabal",
  other: "",
};
