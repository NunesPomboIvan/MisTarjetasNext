"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  HOME_CARD_ORDERS,
  HOME_CARD_ORDER_COOKIE,
  type HomeCardOrder,
} from "@/lib/home-card-order";

export type PreferenceResult = { success: true } | { success: false; error: string };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/** Guarda el orden de las tarjetas del inicio (cookie, como el titular activo). */
export async function setHomeCardOrder(order: HomeCardOrder): Promise<PreferenceResult> {
  if (!HOME_CARD_ORDERS.some((o) => o.value === order)) {
    return { success: false, error: "Orden inválido" };
  }

  const cookieStore = await cookies();
  cookieStore.set(HOME_CARD_ORDER_COOKIE, order, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}
