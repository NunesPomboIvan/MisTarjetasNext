import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { CardForm } from "@/components/cards/card-form";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { BackButton } from "@/components/shared/back-button";

export const metadata = { title: "Nueva tarjeta" };

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: returnParam } = await searchParams;
  const returnTo =
    returnParam && returnParam.startsWith("/") ? returnParam : undefined;
  const backHref = returnTo ?? "/cards";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("id, name, last_four, bank, type, close_date, due_date, color, credit_limit")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .eq("is_extension", false)
    .order("created_at");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const { data: cards } = await cardsQuery;

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton href={backHref} />
          <div>
            <h1 className="text-xl font-bold">Nueva tarjeta</h1>
            <p className="text-sm text-muted-foreground">Completá los datos de tu tarjeta</p>
          </div>
        </div>
      </StickyPageHeader>

      <div className="rounded-2xl border border-border bg-card p-5">
        <CardForm availableParents={cards ?? []} returnTo={returnTo} />
      </div>
    </div>
  );
}
