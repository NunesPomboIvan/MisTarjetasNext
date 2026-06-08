"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/schemas/category";
import type { CategoryFormData } from "@/lib/schemas/category";
import type { ActionResult } from "./cards";

/** Crea una categoría personalizada del usuario */
export async function createCategory(formData: CategoryFormData): Promise<ActionResult & { category?: { id: string; name: string; emoji: string; color_bg: string; color_text: string; is_preset: boolean; user_id: string | null; created_at: string } }> {
  const parsed = categorySchema.safeParse(formData);
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

  // Validar nombre único case-insensitive
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", parsed.data.name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Ya tenés una categoría con ese nombre" };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id, is_preset: false })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/expenses/new");
  return { success: true, id: data.id, category: data };
}

/** Actualiza una categoría personalizada del usuario */
export async function updateCategory(id: string, formData: CategoryFormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(formData);
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

  // Validar nombre único case-insensitive entre las categorías visibles
  // (propias + predefinidas), excluyendo la que estamos editando.
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .or(`user_id.eq.${user.id},is_preset.eq.true`)
    .ilike("name", parsed.data.name)
    .neq("id", id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Ya existe una categoría con ese nombre" };
  }

  // App de uso personal: permite editar tanto las propias como las
  // predefinidas (globales). Se conserva el id, así los consumos siguen ligados.
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .or(`user_id.eq.${user.id},is_preset.eq.true`);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { success: true };
}

/** Elimina una categoría personalizada del usuario.
 * Los consumos que la usaban quedan automáticamente sin categoría (ON DELETE SET NULL).
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // App de uso personal: permite eliminar tanto las propias como las
  // predefinidas. Los consumos asociados quedan sin categoría (ON DELETE SET NULL).
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .or(`user_id.eq.${user.id},is_preset.eq.true`);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { success: true };
}
