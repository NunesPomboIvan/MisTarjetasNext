"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
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

  // Consumo en USD: si el TC usado difiere del global vigente (o no hay
  // global configurado), queda como custom y los cambios globales no lo pisan.
  let customFlag: { exchange_rate_custom: boolean } | undefined;
  if (parsed.data.currency === "USD" && parsed.data.exchange_rate) {
    const global = await getGlobalExchangeRate();
    customFlag = {
      exchange_rate_custom: global == null || parsed.data.exchange_rate !== global.rate,
    };
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, ...customFlag, user_id: user.id })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${parsed.data.card_id}`);
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
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
export async function updateExpense(
  id: string,
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

  // Detección de duplicados: buscar otro consumo (distinto ID) con mismos datos
  if (!options?.skipDuplicateCheck) {
    const { data: dup } = await supabase
      .from("expenses")
      .select("id, description, total_amount")
      .eq("user_id", user.id)
      .eq("card_id", parsed.data.card_id)
      .eq("expense_date", parsed.data.expense_date)
      .ilike("description", parsed.data.description)
      .eq("total_amount", parsed.data.total_amount)
      .neq("id", id)           // excluir el propio consumo que se está editando
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

  // Si el TC en USD cambió respecto del guardado, recalculamos el flag de
  // override: igual al global → sigue el global; distinto → queda custom.
  let customFlag: { exchange_rate_custom: boolean } | undefined;
  if (parsed.data.currency === "USD" && parsed.data.exchange_rate) {
    const { data: existing } = await supabase
      .from("expenses")
      .select("exchange_rate")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const rateChanged =
      existing != null && Number(existing.exchange_rate ?? 0) !== parsed.data.exchange_rate;
    if (rateChanged) {
      const global = await getGlobalExchangeRate();
      customFlag = {
        exchange_rate_custom: global == null || parsed.data.exchange_rate !== global.rate,
      };
    }
  }

  const { error } = await supabase
    .from("expenses")
    .update({ ...parsed.data, ...customFlag })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${parsed.data.card_id}`);
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Actualiza el monto de una cuota específica (índice 0-based).
 * Mantiene installment_amount (monto base) intacto, pero recalcula total_amount
 * como la suma de todas las cuotas (overrides + base) para que el total del
 * consumo siga reflejando la realidad de las cuotas.
 */
export async function updateInstallmentAmount(
  id: string,
  installmentIndex: number,
  amount: number,
  cardId: string
): Promise<ActionResult> {
  if (amount === 0) return { success: false, error: "El monto no puede ser 0" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Obtener el estado actual: overrides + monto base + cantidad de cuotas
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("installment_amounts, installment_amount, installments")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !expense) return { success: false, error: "Gasto no encontrado" };

  const current: Record<string, number> =
    (expense.installment_amounts as Record<string, number>) ?? {};
  const updated = { ...current, [String(installmentIndex)]: amount };

  // Recalcular el total = suma de cada cuota (override si existe, si no la base)
  const base = Number(expense.installment_amount);
  const count = Number(expense.installments);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += updated[String(i)] ?? base;
  }
  total = +total.toFixed(2);

  const { error } = await supabase
    .from("expenses")
    .update({ installment_amounts: updated, total_amount: total })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Actualiza todas las cuotas al mismo monto y limpia overrides individuales.
 * Se usa cuando el usuario elige "Modificar todas las cuotas".
 * También sincroniza total_amount = monto x cantidad de cuotas.
 */
export async function updateAllInstallmentAmounts(
  id: string,
  installmentAmount: number,
  cardId: string
): Promise<ActionResult> {
  if (installmentAmount === 0) return { success: false, error: "El monto no puede ser 0" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Necesitamos la cantidad de cuotas para recalcular el total
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("installments")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !expense) return { success: false, error: "Gasto no encontrado" };

  const total = +(installmentAmount * Number(expense.installments)).toFixed(2);

  const { error } = await supabase
    .from("expenses")
    .update({
      installment_amount: installmentAmount,
      installment_amounts: null,
      total_amount: total,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
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
    return { success: false, error: "Gasto no encontrado" };
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
    recurring: original.recurring,
    discount_percentage: original.discount_percentage,
    discount_cap: original.discount_cap,
    expense_date: today,
    currency: original.currency,
    exchange_rate: original.exchange_rate,
    exchange_rate_custom: original.exchange_rate_custom,
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
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { success: true };
}

/** Elimina varios consumos a la vez */
export async function deleteExpenses(ids: string[], cardId?: string): Promise<ActionResult> {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No hay consumos seleccionados" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  if (cardId) revalidatePath(`/cards/${cardId}`);
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
  return { success: true };
}
