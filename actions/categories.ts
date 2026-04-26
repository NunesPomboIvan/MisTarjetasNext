"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/schemas/category";
import type { CategoryFormData } from "@/lib/schemas/category";
import type { ActionResult } from "./cards";

/** Crea una categoría personalizada del usuario */
export async function createCategory(formData: CategoryFormData): Promise<ActionResult> {
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

  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id, is_preset: false })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, id: data.id };
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

  // Solo puede editar sus propias (is_preset = false)
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_preset", false);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya tenés una categoría con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

/** Elimina una categoría personalizada del usuario */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_preset", false);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { success: true };
}
