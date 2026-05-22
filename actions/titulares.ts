"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_TITULAR_COOKIE } from "@/lib/titulares/server";
import type { Titular } from "@/lib/supabase/database.types";

export type TitularResult =
  | { success: true; titular?: Titular }
  | { success: false; error: string };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/** Crea un titular nuevo y lo deja como activo. */
export async function createTitular(
  name: string,
  color = "#6366f1"
): Promise<TitularResult> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "El nombre es requerido" };
  if (trimmed.length > 40) return { success: false, error: "Máximo 40 caracteres" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("titulares")
    .insert({ user_id: user.id, name: trimmed, color })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un titular con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TITULAR_COOKIE, data.id, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  revalidatePath("/", "layout");
  return { success: true, titular: data as Titular };
}

/** Renombra / recolorea un titular. */
export async function updateTitular(
  id: string,
  name: string,
  color: string
): Promise<TitularResult> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "El nombre es requerido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("titulares")
    .update({ name: trimmed, color })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un titular con ese nombre" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Elimina un titular. Sus tarjetas quedan sin asignar (titular_id = null). */
export async function deleteTitular(id: string): Promise<TitularResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // No permitir borrar el último titular.
  const { count } = await supabase
    .from("titulares")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) <= 1) {
    return { success: false, error: "Tenés que tener al menos un titular" };
  }

  const { error } = await supabase
    .from("titulares")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  // Si era el activo, limpiamos la cookie para que resuelva al primero.
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_TITULAR_COOKIE)?.value === id) {
    cookieStore.delete(ACTIVE_TITULAR_COOKIE);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Fija el titular activo (cookie) y refresca toda la app. */
export async function setActiveTitular(id: string): Promise<TitularResult> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TITULAR_COOKIE, id, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  revalidatePath("/", "layout");
  return { success: true };
}
