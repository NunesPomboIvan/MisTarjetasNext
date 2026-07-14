"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
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
  const { installments, exchange_rate, exchange_rate_custom: wantsCustomRate, ...loanFields } = parsed.data;

  // Préstamo en USD: el usuario elige explícitamente si el TC queda fijo
  // (wantsCustomRate) o sigue al TC general — igual que en los consumos.
  // Cuando sigue al general, usamos el valor del server (no el que mandó el
  // cliente) para evitar que un desfasaje de redondeo lo marque como custom.
  const isUsd = loanFields.currency === "USD";
  let rateFields: { exchange_rate: number; exchange_rate_custom: boolean } | undefined;
  if (isUsd && exchange_rate) {
    if (wantsCustomRate) {
      rateFields = { exchange_rate, exchange_rate_custom: true };
    } else {
      const global = await getGlobalExchangeRate();
      rateFields = {
        exchange_rate: global?.rate ?? exchange_rate,
        // Sin TC general configurado no hay nada que seguir: queda fijo igual.
        exchange_rate_custom: global == null,
      };
    }
  }

  const { data: loanRow, error: loanError } = await supabase
    .from("loans")
    .insert({
      ...loanFields,
      ...rateFields,
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
    ...(rateFields
      ? {
          exchange_rate: rateFields.exchange_rate,
          exchange_rate_custom: rateFields.exchange_rate_custom,
        }
      : {}),
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
  // Solo préstamos en USD: nuevo TC a aplicar a TODAS las cuotas.
  exchange_rate: z
    .number()
    .positive("El tipo de cambio debe ser mayor a 0")
    .nullable()
    .optional(),
});

export type LoanUpdateData = z.infer<typeof loanUpdateSchema>;

/**
 * Actualiza los datos de un préstamo. Si viene exchange_rate (préstamos en
 * USD) y cambió, recalcula TODAS las cuotas con el nuevo TC — la
 * confirmación previa la pide el formulario.
 */
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

  const { data: loan, error: fetchError } = await supabase
    .from("loans")
    .select("currency, exchange_rate")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !loan) return { success: false, error: "Préstamo no encontrado" };

  const newRate = parsed.data.exchange_rate;
  const rateChanged =
    loan.currency === "USD" &&
    newRate != null &&
    Number(loan.exchange_rate ?? 0) !== newRate;

  let rateFields: { exchange_rate: number; exchange_rate_custom: boolean } | undefined;
  if (rateChanged) {
    const global = await getGlobalExchangeRate();
    rateFields = {
      exchange_rate: newRate,
      exchange_rate_custom: global == null || newRate !== global.rate,
    };
  }

  const { error } = await supabase
    .from("loans")
    .update({
      description: parsed.data.description,
      bank: parsed.data.bank ?? null,
      color: parsed.data.color,
      issue_date: parsed.data.issue_date,
      ...(rateFields ?? {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  // Recalcular todas las cuotas con el nuevo TC (el usuario ya confirmó).
  if (rateFields) {
    const { error: instError } = await supabase
      .from("loan_installments")
      .update({
        exchange_rate: rateFields.exchange_rate,
        exchange_rate_custom: rateFields.exchange_rate_custom,
      })
      .eq("loan_id", id)
      .eq("user_id", user.id);

    if (instError) return { success: false, error: instError.message };
  }

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

const installmentUpdateSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
});

export type InstallmentUpdateData = z.infer<typeof installmentUpdateSchema>;

/** Edita el monto y/o la fecha de vencimiento de una cuota puntual */
export async function updateInstallment(
  installmentId: string,
  formData: InstallmentUpdateData
): Promise<ActionResult> {
  const parsed = installmentUpdateSchema.safeParse(formData);
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

  const { data: installment, error: fetchError } = await supabase
    .from("loan_installments")
    .select("loan_id")
    .eq("id", installmentId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !installment) return { success: false, error: "Cuota no encontrada" };

  const { error } = await supabase
    .from("loan_installments")
    .update({ amount: parsed.data.amount, due_date: parsed.data.due_date })
    .eq("id", installmentId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  // El total del préstamo es la suma de sus cuotas: lo recalculamos acá porque
  // no hay trigger de DB que lo mantenga sincronizado.
  const { data: installments, error: sumError } = await supabase
    .from("loan_installments")
    .select("amount")
    .eq("loan_id", installment.loan_id);

  if (!sumError && installments) {
    const total = installments.reduce((acc, i) => acc + Number(i.amount), 0);
    await supabase.from("loans").update({ total_amount: total }).eq("id", installment.loan_id);
  }

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
