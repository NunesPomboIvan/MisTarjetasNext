"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/schemas/expense";
import type { ExpenseFormData } from "@/lib/schemas/expense";
import type { ActionResult } from "./cards";

/** Crea un nuevo consumo */
export async function createExpense(formData: ExpenseFormData): Promise<ActionResult> {
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
