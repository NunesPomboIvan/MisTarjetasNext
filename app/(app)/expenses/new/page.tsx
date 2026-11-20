import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { getMpCommissions } from "@/lib/commissions/server";
import { AddFlow } from "@/components/shared/add-flow";

export const metadata = { title: "Nuevo consumo" };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; fee?: string; recurring?: string }>;
}) {
  const { card_id, fee, recurring } = await searchParams;
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

  const [cardsResult, categoriesResult, globalRate, mpCommissions] = await Promise.all([
    cardsQuery,
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
    getGlobalExchangeRate(),
    getMpCommissions(),
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-300 ease-out">
      <AddFlow
        initialMode="consumo"
        cards={cardsResult.data ?? []}
        categories={categoriesResult.data ?? []}
        defaultCardId={card_id}
        feeMode={fee === "1"}
        recurringMode={recurring === "1"}
        globalRate={globalRate?.rate ?? null}
      mpCommissions={mpCommissions}
      />
    </div>
  );
}
