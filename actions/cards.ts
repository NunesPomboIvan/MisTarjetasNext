"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardSchema } from "@/lib/schemas/card";
import type { CardFormData } from "@/lib/schemas/card";

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Crea una nueva tarjeta */
export async function createCard(formData: CardFormData): Promise<ActionResult> {
  const parsed = cardSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("cards")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una tarjeta con ese nombre y últimos 4 dígitos" };
    }
    return { success: false, error: error.message };
  }

  // Purga el client cache e invalida TODAS las rutas: las imágenes de tarjeta
  // (que derivan del período actual) se actualizan al instante en toda la app.
  revalidatePath("/", "layout");
  return { success: true, id: data.id };
}

/** Actualiza una tarjeta existente */
export async function updateCard(id: string, formData: CardFormData): Promise<ActionResult> {
  const parsed = cardSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("cards")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id); // RLS doble check

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una tarjeta con ese nombre y últimos 4 dígitos" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Archiva/desarchiva una tarjeta */
export async function toggleCardArchived(id: string, archived: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("cards")
    .update({ archived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/** Actualiza solo las fechas de cierre y vencimiento del período vigente */
export async function updateCardPeriod(
  id: string,
  closeDate: string,
  dueDate: string
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closeDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { success: false, error: "Formato de fecha inválido" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("cards")
    .update({ close_date: closeDate, due_date: dueDate })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/** Elimina una tarjeta y todos sus consumos (cascade) */
export async function deleteCard(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/cards");
}
