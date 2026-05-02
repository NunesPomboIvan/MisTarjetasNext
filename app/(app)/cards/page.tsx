import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardList } from "@/components/cards/card-list";

export const metadata = { title: "Mis Tarjetas" };

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cards } = await supabase
    .from("cards")
    .select(`*, expenses (*)`)
    .eq("user_id", user!.id)
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });

  const activeCount = (cards?.filter((c) => !c.archived) ?? []).length;

  return (
    <div className="relative space-y-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--halo-light), transparent 70%)",
        }}
      />

      <div className="relative flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground">
            Mis tarjetas
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {activeCount} activa{activeCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/cards/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white gradient-primary shadow-brand"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </Link>
      </div>

      <CardList cards={(cards as never) ?? []} />
    </div>
  );
}
