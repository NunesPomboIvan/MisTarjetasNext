"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./cards";

export interface BackupData {
  version: number;
  exported_at: string;
  cards: unknown[];
  categories: unknown[];
  expenses: unknown[];
  budgets: unknown[];
}

/** Exporta todos los datos del usuario como JSON */
export async function exportData(): Promise<{ success: true; data: BackupData } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const [cards, categories, expenses, budgets] = await Promise.all([
    supabase.from("cards").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("categories").select("*").eq("user_id", user.id).order("name"),
    supabase.from("expenses").select("*").eq("user_id", user.id).order("expense_date"),
    supabase.from("budgets").select("*").eq("user_id", user.id),
  ]);

  if (cards.error || categories.error || expenses.error || budgets.error) {
    return { success: false, error: "Error al exportar datos" };
  }

  return {
    success: true,
    data: {
      version: 1,
      exported_at: new Date().toISOString(),
      cards: cards.data ?? [],
      categories: categories.data ?? [],
      expenses: expenses.data ?? [],
      budgets: budgets.data ?? [],
    },
  };
}

/** Importa datos desde un JSON de backup */
export async function importData(backup: BackupData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  if (!backup.version || !backup.cards || !backup.expenses) {
    return { success: false, error: "Archivo de backup inválido" };
  }

  try {
    // Insertar en orden para respetar foreign keys
    // Primero categorías custom, luego tarjetas, luego consumos
    if (backup.categories?.length) {
      const cats = (backup.categories as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        user_id: user.id,
        id: undefined, // dejar que Postgres genere nuevo ID
      }));
      // Ignorar duplicados
      await supabase.from("categories").upsert(cats as never, { onConflict: "user_id,name", ignoreDuplicates: true });
    }

    if (backup.cards?.length) {
      const cards = (backup.cards as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        user_id: user.id,
      }));
      await supabase.from("cards").upsert(cards as never, { onConflict: "id", ignoreDuplicates: false });
    }

    if (backup.expenses?.length) {
      const exps = (backup.expenses as Array<Record<string, unknown>>).map((e) => ({
        ...e,
        user_id: user.id,
      }));
      await supabase.from("expenses").upsert(exps as never, { onConflict: "id", ignoreDuplicates: false });
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error en la importación" };
  }
}
