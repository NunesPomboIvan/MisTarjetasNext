"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";

export type ExchangeActionResult =
  | { success: true }
  | { success: false; error: string };

export type GlobalRateResult =
  | { success: true; expensesUpdated: number; installmentsUpdated: number }
  | { success: false; error: string };

/**
 * Configura el TC global (ARS por 1 USD) y recalcula los registros en USD
 * que NO tienen override individual: consumos de tarjeta y cuotas de
 * préstamos. Los registros con exchange_rate_custom = true no se tocan.
 * Guarda el cambio en el historial.
 */
export async function updateGlobalExchangeRate(rate: number): Promise<GlobalRateResult> {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { success: false, error: "El tipo de cambio debe ser mayor a 0" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // 1) Registrar en el historial (la fila más reciente = TC vigente)
  const { error: histError } = await supabase
    .from("exchange_rate_history")
    .insert({ user_id: user.id, rate });

  if (histError) return { success: false, error: histError.message };

  // 2) Consumos en USD sin override individual
  const { data: updatedExpenses, error: expError } = await supabase
    .from("expenses")
    .update({ exchange_rate: rate })
    .eq("user_id", user.id)
    .eq("currency", "USD")
    .eq("exchange_rate_custom", false)
    .select("id");

  if (expError) return { success: false, error: expError.message };

  // 3) Préstamos en USD: el TC de referencia del préstamo (si no es custom)
  //    y todas sus cuotas sin override individual.
  const { data: usdLoans, error: loansError } = await supabase
    .from("loans")
    .select("id")
    .eq("user_id", user.id)
    .eq("currency", "USD");

  if (loansError) return { success: false, error: loansError.message };

  let installmentsUpdated = 0;
  if (usdLoans && usdLoans.length > 0) {
    const loanIds = usdLoans.map((l) => l.id);

    const { error: loanRateError } = await supabase
      .from("loans")
      .update({ exchange_rate: rate })
      .eq("user_id", user.id)
      .eq("currency", "USD")
      .eq("exchange_rate_custom", false);

    if (loanRateError) return { success: false, error: loanRateError.message };

    const { data: updatedInst, error: instError } = await supabase
      .from("loan_installments")
      .update({ exchange_rate: rate })
      .eq("user_id", user.id)
      .eq("exchange_rate_custom", false)
      .in("loan_id", loanIds)
      .select("id");

    if (instError) return { success: false, error: instError.message };
    installmentsUpdated = updatedInst?.length ?? 0;
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    expensesUpdated: updatedExpenses?.length ?? 0,
    installmentsUpdated,
  };
}

/**
 * Personaliza el TC de un consumo puntual. El registro queda bloqueado:
 * los cambios del TC global no lo afectan.
 */
export async function setExpenseRateOverride(
  expenseId: string,
  rate: number
): Promise<ExchangeActionResult> {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { success: false, error: "El tipo de cambio debe ser mayor a 0" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("expenses")
    .update({ exchange_rate: rate, exchange_rate_custom: true })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Vuelve a usar el TC general en un consumo: lo desbloquea y le aplica
 * el TC global vigente.
 */
export async function clearExpenseRateOverride(
  expenseId: string
): Promise<ExchangeActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const global = await getGlobalExchangeRate();
  if (!global) {
    return {
      success: false,
      error: "Configurá primero el tipo de cambio general en Cuenta → Tipo de cambio",
    };
  }

  const { error } = await supabase
    .from("expenses")
    .update({ exchange_rate: global.rate, exchange_rate_custom: false })
    .eq("id", expenseId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Personaliza el TC de una cuota de préstamo puntual. La cuota queda
 * bloqueada: ni el TC global ni el TC del préstamo la pisan.
 */
export async function setInstallmentRateOverride(
  installmentId: string,
  rate: number
): Promise<ExchangeActionResult> {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { success: false, error: "El tipo de cambio debe ser mayor a 0" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("loan_installments")
    .update({ exchange_rate: rate, exchange_rate_custom: true })
    .eq("id", installmentId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Vuelve a usar el TC general en una cuota: la desbloquea y le aplica
 * el TC global vigente (o el del préstamo si no hay global configurado).
 */
export async function clearInstallmentRateOverride(
  installmentId: string
): Promise<ExchangeActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const global = await getGlobalExchangeRate();
  let rate = global?.rate ?? null;

  if (rate == null) {
    // Sin TC global: caemos al TC de referencia del préstamo.
    const { data: inst } = await supabase
      .from("loan_installments")
      .select("loan_id")
      .eq("id", installmentId)
      .eq("user_id", user.id)
      .single();
    if (inst) {
      const { data: loan } = await supabase
        .from("loans")
        .select("exchange_rate")
        .eq("id", inst.loan_id)
        .single();
      rate = loan?.exchange_rate != null ? Number(loan.exchange_rate) : null;
    }
  }

  if (rate == null) {
    return {
      success: false,
      error: "Configurá primero el tipo de cambio general en Cuenta → Tipo de cambio",
    };
  }

  const { error } = await supabase
    .from("loan_installments")
    .update({ exchange_rate: rate, exchange_rate_custom: false })
    .eq("id", installmentId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
