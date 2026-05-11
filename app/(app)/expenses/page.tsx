import Link from "next/link";
import { Search, SlidersHorizontal, Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { formatDate, capitalize } from "@/lib/utils";
import type { ExpenseWithAll } from "@/lib/supabase/database.types";

export const metadata = { title: "Movimientos" };

const MONTH_KEY = (iso: string) => iso.slice(0, 7); // YYYY-MM

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

  let query = supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards(*)")
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .limit(200);

  if (filters.card_id) query = query.eq("card_id", filters.card_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  const { data: expensesData } = await query;
  const expenses = (expensesData ?? []) as ExpenseWithAll[];

  // Agrupar por mes
  const grouped = expenses.reduce<Record<string, ExpenseWithAll[]>>((acc, e) => {
    const key = MONTH_KEY(e.expense_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Movimientos</h1>
        <button
          aria-label="Filtros"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground/70"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Search bar */}
      <form action="/expenses" method="get">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar movimiento"
            className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[14px] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </form>

      {expenses.length === 0 ? (
        <EmptyState
          icon={<span>🧾</span>}
          title="Sin movimientos"
          description="Empezá registrando tu primer consumo"
          action={{ label: "Agregar consumo", href: "/expenses/new" }}
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([month, items]) => {
            const total = items.reduce((s, e) => s + e.installment_amount, 0);
            const monthLabel = capitalize(
              formatDate(month + "-01T00:00:00", "MMMM yyyy")
            );
            return (
              <section key={month}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {monthLabel}
                  </h2>
                  <Money
                    amount={total}
                    className="text-[13px] font-semibold tabular-nums text-foreground"
                  />
                </div>
                <div className="overflow-hidden rounded-[18px] border border-border bg-card">
                  {items.map((exp, i) => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      isLast={i === items.length - 1}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Floating add button */}
      <Link
        href="/expenses/new"
        aria-label="Nuevo movimiento"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white shadow-brand-glow transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

function ExpenseRow({
  expense,
  isLast,
}: {
  expense: ExpenseWithAll;
  isLast: boolean;
}) {
  const cat = expense.category;
  return (
    <Link
      href={`/expenses/${expense.id}/edit`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] text-base"
        style={{
          backgroundColor: cat?.color_bg ?? "var(--muted)",
          color: cat?.color_text ?? "var(--muted-foreground)",
        }}
      >
        {cat?.emoji ?? "•"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">
          {expense.description}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {cat?.name ?? "Sin categoría"}
          {expense.card ? ` · ${expense.card.name}` : ""}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <Money
          amount={expense.installment_amount}
          currency={expense.currency}
          className="block text-[14px] font-semibold tabular-nums text-foreground"
        />
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {formatDate(expense.expense_date + "T00:00:00", "d MMM")}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
