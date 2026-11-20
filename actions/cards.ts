"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { cardSchema } from "@/lib/schemas/card";
import type { CardFormData } from "@/lib/schemas/card";
import { applyPeriodDatesChange } from "@/lib/periods/calculate";

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

  // La tarjeta nueva se asigna al titular activo, así queda agrupada con la
  // persona que se está gestionando en ese momento.
  const titularId = await getActiveTitularId();

  const { data, error } = await supabase
    .from("cards")
    .insert({ ...parsed.data, user_id: user.id, titular_id: titularId })
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

  // Las tarjetas adicionales heredan color y fechas de cierre/vencimiento de su
  // titular (en el formulario esos campos están bloqueados para las adicionales).
  // Si esta tarjeta es titular de otras (extensiones), propagamos esos valores
  // para que las imágenes de tarjeta y los períodos sigan iguales en toda la app.
  await supabase
    .from("cards")
    .update({
      color: parsed.data.color,
      close_date: parsed.data.close_date,
      due_date: parsed.data.due_date,
      ...(parsed.data.close_day_next != null
        ? { close_day_next: parsed.data.close_day_next }
        : {}),
    })
    .eq("parent_card_id", id)
    .eq("user_id", user.id);

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

/**
 * Actualiza las fechas de cierre y vencimiento del período vigente.
 * Las fechas nuevas se replican hacia adelante (mismo día, mes +1 por
 * período); las anteriores quedan congeladas en date_overrides para que los
 * períodos pasados conserven sus fechas históricas. Los consumos no se
 * re-asignan: cada cuota queda anclada al período de su compra + N meses.
 */
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

  const { data: card, error: fetchError } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !card) {
    return { success: false, error: fetchError?.message ?? "Tarjeta no encontrada" };
  }

  const update = applyPeriodDatesChange(card, closeDate, dueDate);

  let { error } = await supabase
    .from("cards")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  // Fallback si la migración 0010 todavía no se aplicó (falta la columna
  // date_overrides): guardamos solo las fechas, como antes, para no romper
  // la renovación de períodos.
  if (error?.message.includes("date_overrides")) {
    ({ error } = await supabase
      .from("cards")
      .update({ close_date: closeDate, due_date: dueDate })
      .eq("id", id)
      .eq("user_id", user.id));
  }

  if (error) return { success: false, error: error.message };

  // Propagar las mismas fechas a todas las tarjetas adicionales (extensiones).
  const { data: childCards } = await supabase
    .from("cards")
    .select("*")
    .eq("parent_card_id", id)
    .eq("user_id", user.id);

  if (childCards && childCards.length > 0) {
    await Promise.all(
      childCards.map(async (child) => {
        const childUpdate = applyPeriodDatesChange(child, closeDate, dueDate);
        let { error: childErr } = await supabase
          .from("cards")
          .update(childUpdate)
          .eq("id", child.id)
          .eq("user_id", user.id);
        if (childErr?.message.includes("date_overrides")) {
          await supabase
            .from("cards")
            .update({ close_date: closeDate, due_date: dueDate })
            .eq("id", child.id)
            .eq("user_id", user.id);
        }
      })
    );
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Marca un período de tarjeta como pagado o no pagado */
export async function toggleCardPeriodPaid(
  cardId: string,
  periodKey: string,
  paid: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("card_period_payments")
    .upsert(
      {
        user_id: user.id,
        card_id: cardId,
        period_key: periodKey,
        paid,
        paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
      },
      { onConflict: "card_id,period_key" }
    );

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
