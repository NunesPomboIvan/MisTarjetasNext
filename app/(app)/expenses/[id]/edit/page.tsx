import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { getGlobalExchangeRate } from "@/lib/exchange/server";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { BackButton } from "@/components/shared/back-button";

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
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("name");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  const [expenseResult, cardsResult, categoriesResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single(),
    cardsQuery,
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
  const globalRate = await getGlobalExchangeRate();

  // Estamos editando un período específico: una cuota puntual, o un mes de un
  // consumo recurrente (installments siempre es 1 para estos, pero igual se
  // edita un período puntual cuando viene con contexto de mes).
  const isInstallmentEdit =
    installmentIndex !== undefined && (expense.installments > 1 || expense.recurring);

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton href={backHref} />
          <div>
            <h1 className="text-xl font-bold">
              {isInstallmentEdit
                ? expense.recurring
                  ? "Editar este mes"
                  : `Editar cuota ${installmentIndex! + 1}/${expense.installments}`
                : "Editar consumo"}
            </h1>
            <p className="text-sm text-muted-foreground truncate max-w-[220px]">
              {expense.description}
            </p>
          </div>
        </div>
      </StickyPageHeader>

      {/* Aviso visible cuando se edita un período específico */}
      {isInstallmentEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          {expense.recurring ? (
            "Estás editando un mes puntual de este consumo fijo mensual. Al guardar podrás elegir si el cambio de importe aplica solo a este mes o a todos."
          ) : (
            <>
              Estás editando la cuota{" "}
              <strong>
                {installmentIndex! + 1}/{expense.installments}
              </strong>{" "}
              de este consumo. Al guardar podrás elegir si el cambio de importe aplica
              solo a esta cuota o a todas.
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <ExpenseForm
          cards={cardsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          expense={expense}
          installmentIndex={installmentIndex}
          globalRate={globalRate?.rate ?? null}
        />
      </div>
    </div>
  );
}
