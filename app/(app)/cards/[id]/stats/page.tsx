import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardStatsClient } from "./client";
import { BackButton } from "@/components/shared/back-button";
import type { Expense, Category } from "@/lib/supabase/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CardStatsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!card) notFound();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Estadísticas</h1>
        <div className="w-10" />
      </div>

      <CardStatsClient
        expenses={(expenses ?? []) as Array<Expense & { category: Category | null }>}
      />
    </div>
  );
}
