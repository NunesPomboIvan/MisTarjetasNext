"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { loanSchema } from "@/lib/schemas/loan";
import type { LoanFormData } from "@/lib/schemas/loan";

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Crea un préstamo con sus cuotas en una sola operación */
export async function createLoan(formData: LoanFormData): Promise<ActionResult> {
  const parsed = loanSchema.safeParse(formData);
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

  // Si el form no trae titular_id explícito, asignamos al titular activo.
  const titularId = parsed.data.titular_id ?? (await getActiveTitularId());
  const { installments, ...loanFields } = parsed.data;

  const { data: loanRow, error: loanError } = await supabase
    .from("loans")
    .insert({
      ...loanFields,
      user_id: user.id,
      titular_id: titularId,
      bank: loanFields.bank ?? null,
    })
    .select("id")
    .single();

  if (loanError || !loanRow) {
    return { success: false, error: loanError?.message ?? "No se pudo crear el préstamo" };
  }

  const installmentRows = installments.map((i) => ({
    loan_id: loanRow.id,
    user_id: user.id,
    installment_number: i.installment_number,
    amount: i.amount,
    due_date: i.due_date,
  }));

  const { error: instError } = await supabase
    .from("loan_installments")
    .insert(installmentRows);

  if (instError) {
    // Rollback manual: no hay transacciones desde el cliente JS.
    await supabase.from("loans").delete().eq("id", loanRow.id);
    return { success: false, error: instError.message };
  }

  revalidatePath("/", "layout");
  return { success: true, id: loanRow.id };
}

/** Marca una cuota como pagada o no pagada */
export async function toggleInstallmentPaid(
  installmentId: string,
  paid: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("loan_installments")
    .update({ paid, paid_date: paid ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", installmentId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/** Elimina un préstamo y sus cuotas (cascade) */
export async function deleteLoan(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("loans")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
