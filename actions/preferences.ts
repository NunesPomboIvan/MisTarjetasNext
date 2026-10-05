"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOME_CARD_ORDERS, type HomeCardOrder } from "@/lib/home-card-order";

export type PreferenceResult = { success: true } | { success: false; error: string };

/** Guarda el orden de las tarjetas del inicio en el perfil del usuario. */
export async function setHomeCardOrder(order: HomeCardOrder): Promise<PreferenceResult> {
  if (!HOME_CARD_ORDERS.some((o) => o.value === order)) {
    return { success: false, error: "Orden inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { home_card_order: order } });
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}
