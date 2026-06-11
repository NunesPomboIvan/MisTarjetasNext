/**
 * lib/exchange/server.ts
 *
 * Lectura del tipo de cambio GLOBAL (ARS por 1 USD).
 * El TC vigente es la fila más reciente de exchange_rate_history; cada
 * modificación inserta una fila nueva, así el historial queda registrado.
 */
import { createClient } from "@/lib/supabase/server";

export interface GlobalExchangeRate {
  rate: number;
  /** Fecha (ISO) en que se configuró el TC vigente */
  updatedAt: string;
}

/**
 * TC global vigente del usuario, o null si nunca se configuró
 * (o si la tabla todavía no existe — migración 0011 sin aplicar).
 */
export async function getGlobalExchangeRate(): Promise<GlobalExchangeRate | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("exchange_rate_history")
    .select("rate, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return { rate: Number(data.rate), updatedAt: data.created_at };
}
