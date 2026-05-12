import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardForm } from "@/components/cards/card-form";

export const metadata = { title: "Nueva tarjeta" };

export default async function NewCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, last_four, bank, type, close_date, due_date, color, credit_limit")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .eq("is_extension", false)
    .order("created_at");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/cards"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nueva tarjeta</h1>
          <p className="text-sm text-muted-foreground">Completá los datos de tu tarjeta</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <CardForm availableParents={cards ?? []} />
      </div>
    </div>
  );
}
