import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { Money } from "@/components/shared/money";
import { ExpenseDetailActions } from "@/components/expenses/expense-detail-actions";
import { formatDate, capitalize, formatCurrency } from "@/lib/utils";
import type { ExpenseWithAll } from "@/lib/supabase/database.types";

export const metadata = { title: "Detalle del consumo" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card_id?: string; installment?: string }>;
}

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { card_id, installment } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards(*)")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!data) notFound();

  const expense = data as ExpenseWithAll;
  const cat = expense.category;
  const card = expense.card;

  const backHref = card_id ? `/cards/${card_id}` : "/expenses";
  const editParams = new URLSearchParams();
  if (card_id) editParams.set("card_id", card_id);
  if (installment !== undefined) editParams.set("installment", installment);
  const editHref = editParams.toString()
    ? `/expenses/${expense.id}/edit?${editParams.toString()}`
    : `/expenses/${expense.id}/edit`;

  const installmentIdx =
    installment !== undefined ? parseInt(installment, 10) : undefined;

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-[15px] font-semibold text-foreground">
            Detalle del consumo
          </h1>
          <span className="h-10 w-10" />
        </div>
      </StickyPageHeader>

      {/* Resumen */}
      <section className="rounded-[20px] border border-border bg-card p-5 text-center shadow-sm">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{
            backgroundColor: cat?.color_bg ?? "var(--muted)",
            color: cat?.color_text ?? "var(--muted-foreground)",
          }}
        >
          {cat?.emoji ?? "•"}
        </div>
        <p className="mt-3 text-[17px] font-semibold text-foreground">
          {expense.description}
        </p>
        <Money
          amount={expense.total_amount}
          currency={expense.currency}
          className="mt-1 block font-display text-[26px] font-bold tracking-tight text-foreground"
        />
        {expense.installments > 1 && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {expense.installments} cuotas de{" "}
            {formatCurrency(expense.installment_amount, expense.currency)}
          </p>
        )}
      </section>

      {/* Detalle */}
      <section className="overflow-hidden rounded-[18px] border border-border bg-card">
        <DetailRow label="Tarjeta" value={card ? card.name : "—"} />
        <DetailRow
          label="Categoría"
          value={cat ? `${cat.emoji ?? ""} ${cat.name}`.trim() : "Sin categoría"}
        />
        <DetailRow
          label="Fecha"
          value={capitalize(
            formatDate(expense.expense_date + "T00:00:00", "d 'de' MMMM yyyy")
          )}
        />
        <DetailRow
          label="Cuotas"
          value={
            expense.installments > 1
              ? installmentIdx !== undefined && installmentIdx >= 0
                ? `Cuota ${installmentIdx + 1} de ${expense.installments}`
                : `${expense.installments} cuotas`
              : "Pago único"
          }
        />
        {expense.discount_percentage != null &&
          expense.discount_percentage > 0 && (
            <DetailRow
              label="Descuento"
              value={`${expense.discount_percentage}%${
                expense.discount_cap != null
                  ? ` (tope ${formatCurrency(expense.discount_cap)})`
                  : ""
              }`}
            />
          )}
        {expense.notes && <DetailRow label="Notas" value={expense.notes} />}
        {expense.tags && expense.tags.length > 0 && (
          <DetailRow label="Tags" value={expense.tags.map((t) => `#${t}`).join(" ")} />
        )}
      </section>

      <ExpenseDetailActions
        expenseId={expense.id}
        cardId={expense.card_id}
        editHref={editHref}
        backHref={backHref}
        description={expense.description}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-[14px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
