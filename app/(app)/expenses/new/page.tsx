import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { NewExpenseHero } from "@/components/expenses/new-expense-hero";

export const metadata = { title: "Nuevo consumo" };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string }>;
}) {
  const { card_id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("name");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const [cardsResult, categoriesResult] = await Promise.all([
    cardsQuery,
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
  ]);

  const backHref = card_id ? `/cards/${card_id}` : "/";

  return (
    <NewExpenseHero
      cards={cardsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      defaultCardId={card_id}
      backHref={backHref}
    />
  );
}
