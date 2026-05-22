import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { StatsClient } from "./stats-client";
import type { Expense, Category } from "@/lib/supabase/database.types";

export const metadata = { title: "Estadísticas" };

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let titularCardIds: string[] | null = null;
  if (activeTitularId) {
    const { data: titularCards } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user!.id)
      .eq("titular_id", activeTitularId);
    titularCardIds = (titularCards ?? []).map((c) => c.id);
  }

  let expensesQuery = supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .limit(500);
  if (titularCardIds) expensesQuery = expensesQuery.in("card_id", titularCardIds);

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false);
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const [expensesResult, cardsResult] = await Promise.all([
    expensesQuery,
    cardsQuery,
  ]);

  return (
    <StatsClient
      expenses={(expensesResult.data ?? []) as Array<Expense & { category: Category | null }>}
      cards={cardsResult.data ?? []}
    />
  );
}
