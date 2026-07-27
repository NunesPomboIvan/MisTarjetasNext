import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getCurrentPeriod, getPeriodByKey } from "@/lib/periods/calculate";
import { buildPeriodSummaryWorkbook, type PeriodSummarySection } from "@/lib/export/period-summary-xlsx";
import type { Card, ExpenseWithCategory } from "@/lib/supabase/database.types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function fileSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cardId = request.nextUrl.searchParams.get("cardId");
  const periodParam = request.nextUrl.searchParams.get("period");

  let cards: Card[];
  if (cardId) {
    const { data: card } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .eq("user_id", user!.id)
      .single();
    if (!card) {
      return new Response("Tarjeta no encontrada", { status: 404 });
    }
    cards = [card as Card];
  } else {
    const activeTitularId = await getActiveTitularId();
    let query = supabase
      .from("cards")
      .select("*")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .order("created_at");
    if (activeTitularId) query = query.eq("titular_id", activeTitularId);
    const { data } = await query;
    cards = (data ?? []) as Card[];
  }

  if (cards.length === 0) {
    return new Response("No hay tarjetas para exportar", { status: 404 });
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("user_id", user!.id)
    .in(
      "card_id",
      cards.map((c) => c.id)
    );

  const allExpenses = (expenses ?? []) as ExpenseWithCategory[];

  const sections: PeriodSummarySection[] = cards.map((card) => {
    const period = periodParam ? getPeriodByKey(card, periodParam) : getCurrentPeriod(card);
    return {
      card,
      period,
      expenses: allExpenses.filter((e) => e.card_id === card.id),
    };
  });

  const workbook = buildPeriodSummaryWorkbook(sections);
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = cardId
    ? `Resumen_Periodo_${fileSafe(cards[0].bank || cards[0].name)}_${todayKey()}.xlsx`
    : `Resumen_General_${todayKey()}.xlsx`;

  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
