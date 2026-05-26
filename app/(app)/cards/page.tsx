import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { CardList } from "@/components/cards/card-list";

export const metadata = { title: "Tarjetas" };

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select(`*, expenses (*)`)
    .eq("user_id", user!.id)
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const { data: cards } = await cardsQuery;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
          Tarjetas
        </h1>

        <Link
          href="/cards/new"
          className="btn-glass-primary inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </Link>
      </div>

      <CardList cards={(cards as never) ?? []} />
    </div>
  );
}
