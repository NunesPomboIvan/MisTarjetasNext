import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardForm } from "@/components/cards/card-form";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";

export const metadata = { title: "Editar tarjeta" };

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: card }, { data: allCards }] = await Promise.all([
    supabase.from("cards").select("*").eq("id", id).eq("user_id", user!.id).single(),
    supabase
      .from("cards")
      .select("id, name, last_four, bank, type, close_date, due_date, color, credit_limit")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .eq("is_extension", false)
      .order("created_at"),
  ]);

  if (!card) notFound();

  // Excluir la propia tarjeta de los posibles padres
  const availableParents = (allCards ?? []).filter((c) => c.id !== id);

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <Link
            href={`/cards/${id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Editar tarjeta</h1>
            <p className="text-sm text-muted-foreground">{card.name} •••• {card.last_four}</p>
          </div>
        </div>
      </StickyPageHeader>

      <div className="rounded-2xl border border-border bg-card p-5">
        <CardForm card={card} availableParents={availableParents} />
      </div>
    </div>
  );
}
