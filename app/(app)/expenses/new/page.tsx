import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const metadata = { title: "Nuevo consumo" };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string }>;
}) {
  const { card_id } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [cardsResult, categoriesResult] = await Promise.all([
    supabase
      .from("cards")
      .select("*")
      .eq("user_id", user!.id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
  ]);

  const backHref = card_id ? `/cards/${card_id}` : "/expenses";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo consumo</h1>
          <p className="text-sm text-muted-foreground">Registrá un gasto en tu tarjeta</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <ExpenseForm
          cards={cardsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          defaultCardId={card_id}
        />
      </div>
    </div>
  );
}
