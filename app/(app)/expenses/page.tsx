import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { formatDate } from "@/lib/utils";
import type { ExpenseWithAll } from "@/lib/supabase/database.types";

export const metadata = { title: "Consumos" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    card_id?: string;
    category_id?: string;
    q?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Build query con filtros — incluye datos de tarjeta para mostrar el nombre
  let query = supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards(*)")
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .limit(100);

  if (filters.card_id) query = query.eq("card_id", filters.card_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  const { data: expensesData } = await query;

  const expenses = (expensesData ?? []) as ExpenseWithAll[];
  const total = expenses.reduce((s, e) => s + e.installment_amount, 0);

  // Agrupar por fecha
  const grouped = expenses.reduce<Record<string, ExpenseWithAll[]>>((acc, e) => {
    const key = e.expense_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Consumos</h1>
          <p className="text-sm text-muted-foreground">
            {expenses.length} consumo{expenses.length !== 1 ? "s" : ""} ·{" "}
            <Money amount={total} className="text-sm" />
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white gradient-primary shadow-brand"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </Link>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={<span>🧾</span>}
          title="Sin consumos"
          description="Empezá registrando tu primer consumo"
          action={{ label: "Agregar consumo", href: "/expenses/new" }}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatDate(date + "T00:00:00", "EEEE d 'de' MMMM")}
              </p>
              <div className="space-y-2">
                {items.map((e) => (
                  <ExpenseItem
                    key={e.id}
                    expense={e}
                    cardName={e.card?.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
