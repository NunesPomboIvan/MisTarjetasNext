import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { CardList } from "@/components/cards/card-list";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";

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
  const activeCount = (cards ?? []).filter((c) => !c.archived).length;

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
              Tarjetas
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold tabular-nums text-primary">
                {activeCount}
              </span>
              <span className="flex-shrink-0 text-[12.5px] font-medium text-muted-foreground">
                activa{activeCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <Link
            href="/cards/new"
            className="btn-glass-primary inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </div>
      </StickyPageHeader>

      <CardList cards={(cards as never) ?? []} />
    </div>
  );
}
