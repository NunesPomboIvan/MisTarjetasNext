"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { expenseSchema } from "@/lib/schemas/expense";
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

/* ─── Export / Import de consumos en CSV ──────────────────── */

const CSV_HEADERS = [
  "Fecha",
  "Comercio",
  "Banco",
  "NumeroTarjeta",
  "Categoria",
  "MontoTotal",
  "Cuotas",
  "MontoCuota",
  "Moneda",
  "Notas",
  "Tags",
] as const;

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Parser de CSV simple con soporte de campos entrecomillados (separador coma). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ExportExpensesFilters {
  /** IDs de tarjetas a incluir. Vacío o ausente = todas las tarjetas. */
  cardIds?: string[];
  /** Fecha desde (YYYY-MM-DD, inclusive). Ausente = sin límite inferior. */
  dateFrom?: string;
  /** Fecha hasta (YYYY-MM-DD, inclusive). Ausente = sin límite superior. */
  dateTo?: string;
}

/** Exporta los consumos del usuario como CSV (legible/editable en Excel). */
export async function exportExpensesCsv(
  filters?: ExportExpensesFilters
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  let query = supabase
    .from("expenses")
    .select("*, category:categories(name), card:cards(name, bank, last_four)")
    .eq("user_id", user.id);

  if (filters?.cardIds?.length) query = query.in("card_id", filters.cardIds);
  if (filters?.dateFrom) query = query.gte("expense_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("expense_date", filters.dateTo);

  const { data, error } = await query.order("expense_date", { ascending: false });

  if (error) return { success: false, error: "Error al exportar consumos" };

  const lines = [CSV_HEADERS.join(",")];
  for (const e of data ?? []) {
    const card = (e as { card?: { name?: string; bank?: string; last_four?: string } }).card;
    const cat = (e as { category?: { name?: string } }).category;
    lines.push(
      [
        e.expense_date,
        e.description,
        card ? (card.bank || card.name || "") : "",
        card?.last_four ?? "",
        cat?.name ?? "",
        e.total_amount,
        e.installments,
        e.installment_amount,
        e.currency,
        e.notes ?? "",
        (e.tags ?? []).join("|"),
      ]
        .map(csvCell)
        .join(",")
    );
  }

  return { success: true, csv: "﻿" + lines.join("\r\n") };
}

/**
 * Genera una plantilla CSV (mismas columnas que la exportación) con filas de
 * ejemplo, para que el usuario la complete e importe.
 */
export async function exportCsvTemplate(): Promise<{ success: true; csv: string }> {
  const examples: string[][] = [
    ["31/05/2026", "Ejemplo: Fravega", "Nacion", "1086", "Tecnología", "120000", "3", "40000", "ARS", "", ""],
    ["26/05/2026", "Ejemplo: Supermercado", "Macro", "6426", "Supermercado", "15499.90", "1", "", "ARS", "nota opcional", "tag1|tag2"],
  ];
  const lines = [CSV_HEADERS.join(",")];
  for (const row of examples) lines.push(row.map(csvCell).join(","));
  return { success: true, csv: "﻿" + lines.join("\r\n") };
}

/** Importa consumos desde un CSV con las mismas columnas que la exportación. */
export async function importExpensesCsv(
  csvText: string
): Promise<ActionResult & { imported?: number; skipped?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const rows = parseCsv(csvText.replace(/^﻿/, ""));
  if (rows.length < 2) {
    return { success: false, error: "El archivo no tiene filas para importar" };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idx = {
    fecha: col("Fecha"),
    comercio: col("Comercio"),
    banco: col("Banco"),
    numero: col("NumeroTarjeta"),
    // Compatibilidad con el formato anterior: una sola columna "Tarjeta"
    // que combinaba nombre + últimos 4 dígitos ("Santander ····1234").
    tarjeta: col("Tarjeta"),
    categoria: col("Categoria"),
    total: col("MontoTotal"),
    cuotas: col("Cuotas"),
    cuota: col("MontoCuota"),
    moneda: col("Moneda"),
    notas: col("Notas"),
    tags: col("Tags"),
  };

  // Algunas exportaciones (Excel/planillas) dejan la columna de fecha sin
  // encabezado (la fila empieza con ","). Si no hay "Fecha" pero la 1ª columna
  // está vacía, la usamos como fecha.
  if (idx.fecha < 0 && header[0] === "") idx.fecha = 0;

  const hasCardColumn = idx.banco >= 0 || idx.numero >= 0 || idx.tarjeta >= 0;
  if (idx.fecha < 0 || idx.comercio < 0 || !hasCardColumn || idx.total < 0) {
    return {
      success: false,
      error: "Faltan columnas requeridas: Fecha, Comercio, Banco/NumeroTarjeta, MontoTotal",
    };
  }

  const [cardsRes, catsRes] = await Promise.all([
    supabase.from("cards").select("id, name, bank, last_four").eq("user_id", user.id),
    supabase
      .from("categories")
      .select("id, name")
      .or(`user_id.eq.${user.id},user_id.is.null`),
  ]);

  const cards = cardsRes.data ?? [];
  const cats = catsRes.data ?? [];

  const norm = (s: string) => s.trim().toLowerCase();
  const cardMatchesBank = (c: (typeof cards)[number], bank: string) =>
    norm(c.bank ?? "") === bank || norm(c.name) === bank;

  /**
   * Busca la tarjeta por banco y/o número (cada uno en su columna). Si solo
   * viene la columna combinada antigua, la descompone en banco + últimos 4.
   */
  const findCard = (bankRaw: string, numberRaw: string, comboRaw: string) => {
    let bank = norm(bankRaw);
    let last4 = numberRaw.replace(/\D/g, "").slice(-4);

    if (!bank && !last4 && comboRaw) {
      last4 = comboRaw.match(/(\d{4})\s*$/)?.[1] ?? "";
      bank = norm(comboRaw.replace(/[·•\s]*\d{4}\s*$/, ""));
    }

    if (bank && last4) {
      return (
        cards.find((c) => cardMatchesBank(c, bank) && c.last_four === last4) ??
        cards.find((c) => c.last_four === last4) ??
        cards.find((c) => cardMatchesBank(c, bank))
      );
    }
    if (last4) return cards.find((c) => c.last_four === last4);
    if (bank) return cards.find((c) => cardMatchesBank(c, bank));
    return undefined;
  };
  const findCat = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return null;
    return cats.find((c) => c.name.toLowerCase() === v) ?? null;
  };

  const parseNum = (raw: string): number => {
    const s = raw.trim().replace(/\s/g, "");
    if (s.includes(",") && s.includes(".")) {
      // formato 1.234,56 → 1234.56
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(s.replace(",", "."));
  };

  // Normaliza la fecha a YYYY-MM-DD. Acepta YYYY-MM-DD y DD/MM/YYYY (o con
  // guiones/puntos), que es como Excel reescribe las fechas en es-AR.
  const toIsoDate = (raw: string): string => {
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yy}-${mm}-${dd}`;
    }
    return s; // si no la reconocemos, dejamos que la validación la rechace
  };

  let imported = 0;
  let skipped = 0;
  const toInsert: Record<string, unknown>[] = [];

  for (const r of rows.slice(1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const card = findCard(get(idx.banco), get(idx.numero), get(idx.tarjeta));
    const total = parseNum(get(idx.total));
    const installments = Math.max(1, parseInt(get(idx.cuotas) || "1", 10) || 1);
    const cuotaRaw = get(idx.cuota);
    const installment_amount = cuotaRaw
      ? parseNum(cuotaRaw)
      : parseFloat((total / installments).toFixed(2));
    const tagsRaw = get(idx.tags);

    const candidate = {
      card_id: card?.id ?? "",
      category_id: findCat(get(idx.categoria))?.id ?? null,
      description: get(idx.comercio),
      total_amount: total,
      installments,
      installment_amount,
      expense_date: toIsoDate(get(idx.fecha)),
      currency: (get(idx.moneda) || "ARS").toUpperCase(),
      notes: get(idx.notas) || null,
      tags: tagsRaw
        ? tagsRaw.split(/[|;]/).map((t) => t.trim()).filter(Boolean)
        : [],
    };

    const parsed = expenseSchema.safeParse(candidate);
    if (!card || !parsed.success) {
      skipped++;
      continue;
    }
    toInsert.push({ ...parsed.data, user_id: user.id });
    imported++;
  }

  if (toInsert.length === 0) {
    return {
      success: false,
      error: `No se importó ningún consumo (${skipped} filas inválidas o sin tarjeta coincidente)`,
    };
  }

  const { error } = await supabase.from("expenses").insert(toInsert as never);
  if (error) return { success: false, error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true, imported, skipped };
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
      // Las tarjetas restauradas se asignan al titular activo: evita FKs rotas
      // por titular_id viejos y que queden ocultas al filtrar por titular.
      const titularId = await getActiveTitularId();
      const cards = (backup.cards as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        user_id: user.id,
        titular_id: titularId,
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
