import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { AddFlow } from "@/components/shared/add-flow";

export const metadata = { title: "Nuevo" };

export default async function NuevoPage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; tipo?: string }>;
}) {
  const { card_id, tipo } = await searchParams;
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

  const backHref = card_id ? `/cards/${card_id}` : "/";

  return (
    <AddFlow
      initialMode={tipo === "prestamo" ? "prestamo" : "consumo"}
      cards={cardsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      defaultCardId={card_id}
      backHref={backHref}
      globalRate={globalRate?.rate ?? null}
    />
  );
}
