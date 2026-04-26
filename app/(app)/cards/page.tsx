import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardList } from "@/components/cards/card-list";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Mis Tarjetas" };

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cards } = await supabase
    .from("cards")
    .select(`
      *,
      expenses (*)
    `)
    .eq("user_id", user!.id)
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mis Tarjetas</h1>
          <p className="text-sm text-muted-foreground">
            {(cards?.filter((c) => !c.archived) ?? []).length} activa{(cards?.filter((c) => !c.archived) ?? []).length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/cards/new"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white gradient-primary shadow-brand transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </Link>
      </div>

      <CardList cards={(cards as never) ?? []} />
    </div>
  );
}
