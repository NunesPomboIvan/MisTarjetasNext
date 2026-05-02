"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/schemas/expense";
import type { ExpenseFormData } from "@/lib/schemas/expense";
import type { ActionResult } from "./cards";

/** Crea un nuevo consumo */
export async function createExpense(
  formData: ExpenseFormData,
  options?: { skipDuplicateCheck?: boolean }
): Promise<ActionResult & { duplicate?: { id: string; description: string; total_amount: number } }> {
  const parsed = expenseSchema.safeParse(formData);
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

  // Detección de duplicados: misma tarjeta + descripción + total + fecha
  if (!options?.skipDuplicateCheck) {
    const { data: dup } = await supabase
      .from("expenses")
      .select("id, description, total_amount")
      .eq("user_id", user.id)
      .eq("card_id", parsed.data.card_id)
      .eq("expense_date", parsed.data.expense_date)
      .ilike("description", parsed.data.description)
      .eq("total_amount", parsed.data.total_amount)
      .limit(1)
      .maybeSingle();

    if (dup) {
      return {
        success: false,
        error: "Posible duplicado detectado",
        duplicate: dup as { id: string; description: string; total_amount: number },
      };
    }
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${parsed.data.card_id}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true, id: data.id };
}

/** Sugerencias de descripciones recientes/frecuentes del usuario */
export async function getDescriptionSuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("expenses")
    .select("description")
    .eq("user_id", user.id)
    .ilike("description", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  // De-duplicar manteniendo el orden por recencia
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data) {
    const d = row.description?.trim();
    if (d && !seen.has(d.toLowerCase())) {
      seen.add(d.toLowerCase());
      out.push(d);
    }
    if (out.length >= 5) break;
  }
  return out;
}

/** Actualiza un consumo existente */
export async function updateExpense(id: string, formData: ExpenseFormData): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(formData);
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
    .from("expenses")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${parsed.data.card_id}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

/**
 * Actualiza el monto de una cuota específica (índice 0-based).
 * No toca installment_amount ni el resto del gasto.
 */
export async function updateInstallmentAmount(
  id: string,
  installmentIndex: number,
  amount: number,
  cardId: string
): Promise<ActionResult> {
  if (amount <= 0) return { success: false, error: "El monto debe ser mayor a 0" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Obtener el estado actual de installment_amounts
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("installment_amounts")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !expense) return { success: false, error: "Consumo no encontrado" };

  const current: Record<string, number> =
    (expense.installment_amounts as Record<string, number>) ?? {};
  const updated = { ...current, [String(installmentIndex)]: amount };

  const { error } = await supabase
    .from("expenses")
    .update({ installment_amounts: updated })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

/**
 * Actualiza todas las cuotas al mismo monto y limpia overrides individuales.
 * Se usa cuando el usuario elige "Modificar todas las cuotas".
 */
export async function updateAllInstallmentAmounts(
  id: string,
  installmentAmount: number,
  cardId: string
): Promise<ActionResult> {
  if (installmentAmount <= 0) return { success: false, error: "El monto debe ser mayor a 0" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("expenses")
    .update({ installment_amount: installmentAmount, installment_amounts: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

/**
 * Clona un consumo existente con la fecha de hoy.
 * Útil para gastos que se repiten mes a mes (suscripciones, alquiler, servicios).
 */
export async function cloneExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: original, error: fetchError } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { success: false, error: "Consumo no encontrado" };
  }

  const today = new Date().toISOString().slice(0, 10);

  const clone = {
    user_id: user.id,
    card_id: original.card_id,
    category_id: original.category_id,
    description: original.description,
    total_amount: original.total_amount,
    installments: original.installments,
    installment_amount: original.installment_amount,
    discount_percentage: original.discount_percentage,
    discount_cap: original.discount_cap,
    expense_date: today,
    currency: original.currency,
    notes: original.notes,
    tags: original.tags,
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(clone)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${original.card_id}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true, id: data.id };
}

/** Elimina un consumo */
export async function deleteExpense(id: string, cardId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}
