import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { AddFlow } from "@/components/shared/add-flow";

export const metadata = { title: "Nuevo préstamo" };

export default async function NewLoanPage() {
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

  const [cardsResult, categoriesResult, globalRate] = await Promise.all([
    cardsQuery,
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
    getGlobalExchangeRate(),
  ]);

  return (
    <AddFlow
      initialMode="prestamo"
      cards={cardsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      backHref="/prestamos"
      globalRate={globalRate?.rate ?? null}
    />
  );
}
