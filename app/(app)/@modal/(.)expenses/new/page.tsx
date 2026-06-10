import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { NewExpenseModal } from "@/components/expenses/new-expense-modal";

// Ruta interceptada: en navegaciones de cliente hacia `/expenses/new` (FAB,
// botones "Agregar consumo", etc.) se muestra como bottom sheet sobre la
// pantalla actual. En carga directa / refresh cae a la pantalla completa.
export default async function NewExpenseModalRoute({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; fee?: string }>;
}) {
  const { card_id, fee } = await searchParams;
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

  return (
    <NewExpenseModal
      cards={cardsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      defaultCardId={card_id}
      feeMode={fee === "1"}
    />
  );
}
