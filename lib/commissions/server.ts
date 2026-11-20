import { createClient } from "@/lib/supabase/server";
import { parseMpCommissions, type MpCommissions } from "./mercadopago";

/** % de comisión de Mercado Pago por red, configurados en Ajustes. */
export async function getMpCommissions(): Promise<MpCommissions> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("user_settings")
    .select("mp_commissions")
    .eq("user_id", user.id)
    .maybeSingle();

  // Sin la migración 0016 aplicada la tabla no existe: se sigue sin comisiones.
  if (error || !data) return {};
  return parseMpCommissions(data.mp_commissions);
}
