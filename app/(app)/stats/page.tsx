import { createClient } from "@/lib/supabase/server";
import { StatsClient } from "./stats-client";
import type { Expense, Category, Card } from "@/lib/supabase/database.types";

export const metadata = { title: "Estadísticas" };

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [expensesResult, cardsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, category:categories(*)")
      .eq("user_id", user!.id)
      .order("expense_date", { ascending: false })
      .limit(500),
    supabase
      .from("cards")
      .select("*")
      .eq("user_id", user!.id)
      .eq("archived", false),
  ]);

  return (
    <StatsClient
      expenses={(expensesResult.data ?? []) as Array<Expense & { category: Category | null }>}
      cards={cardsResult.data ?? []}
    />
  );
}
