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

/** Marca o desmarca un consumo como pagado */
export async function toggleExpensePaid(id: string, paid: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("card_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !expense) return { success: false, error: "Consumo no encontrado" };

  const { error } = await supabase
    .from("expenses")
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/cards/${expense.card_id}`);
  revalidatePath("/expenses");
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
