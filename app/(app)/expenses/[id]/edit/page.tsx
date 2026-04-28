import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const metadata = { title: "Editar consumo" };

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    /** Índice 0-based de la cuota que se estaba viendo al hacer clic en Editar */
    installment?: string;
    /** ID de la tarjeta, para el botón volver */
    card_id?: string;
  }>;
}

export default async function EditExpensePage({
  params,
  searchParams,
}: EditExpensePageProps) {
  const { id } = await params;
  const { installment, card_id } = await searchParams;
  const installmentIndex = installment !== undefined ? parseInt(installment) : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [expenseResult, cardsResult, categoriesResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single(),
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

  if (!expenseResult.data) notFound();

  const expense = expenseResult.data;
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
          <h1 className="text-xl font-bold">Editar consumo</h1>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
            {expense.description}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <ExpenseForm
          cards={cardsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          expense={expense}
          installmentIndex={installmentIndex}
        />
      </div>
    </div>
  );
}
