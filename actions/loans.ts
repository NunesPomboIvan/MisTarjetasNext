"use server";

import { z } from "zod";
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

const loanUpdateSchema = z.object({
  description: z.string().min(1, "La descripción es requerida").max(80, "Máximo 80 caracteres"),
  bank: z.string().max(40).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de emisión inválida"),
});

export type LoanUpdateData = z.infer<typeof loanUpdateSchema>;

/** Actualiza los datos de un préstamo (sin tocar sus cuotas) */
export async function updateLoan(id: string, formData: LoanUpdateData): Promise<ActionResult> {
  const parsed = loanUpdateSchema.safeParse(formData);
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
    .from("loans")
    .update({
      description: parsed.data.description,
      bank: parsed.data.bank ?? null,
      color: parsed.data.color,
      issue_date: parsed.data.issue_date,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, id };
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
