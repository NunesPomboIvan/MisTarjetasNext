import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Titular } from "@/lib/supabase/database.types";

export const ACTIVE_TITULAR_COOKIE = "active_titular";

export interface ResolvedTitulares {
  /** Todos los titulares del usuario, ordenados por creación. */
  titulares: Titular[];
  /** Id del titular activo (cookie validada, o el primero). null si no hay ninguno. */
  activeId: string | null;
  /** El titular activo resuelto, o null. */
  active: Titular | null;
}

/**
 * Lee los titulares del usuario y resuelve el activo a partir de la cookie.
 * Si la cookie está vacía o apunta a un titular inexistente, cae al primero.
 * Centraliza la lógica para que todas las páginas filtren igual.
 */
export async function resolveTitulares(): Promise<ResolvedTitulares> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("titulares")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at");

  const titulares = (data ?? []) as Titular[];
  if (titulares.length === 0) {
    return { titulares, activeId: null, active: null };
  }

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_TITULAR_COOKIE)?.value;
  const active = titulares.find((t) => t.id === cookieId) ?? titulares[0];

  return { titulares, activeId: active.id, active };
}

/**
 * Atajo cuando solo se necesita el id del titular activo para filtrar queries.
 */
export async function getActiveTitularId(): Promise<string | null> {
  return (await resolveTitulares()).activeId;
}
