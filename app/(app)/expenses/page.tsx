import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { MovimientosFilters } from "@/components/expenses/movimientos-filters";
import { LiveSearch } from "@/components/expenses/live-search";
import { formatDate, capitalize } from "@/lib/utils";
import type { ExpenseWithAll, Card, Category } from "@/lib/supabase/database.types";

export const metadata = { title: "Movimientos" };

const MONTH_KEY = (iso: string) => iso.slice(0, 7); // YYYY-MM

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    card_id?: string;
    category_id?: string;
    date_from?: string;
    date_to?: string;
    cuotas?: string;
    q?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  // Tarjetas del titular activo: acotan tanto los movimientos como el filtro de tarjeta.
  let titularCardIds: string[] | null = null;
  if (activeTitularId) {
    const { data: titularCards } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user!.id)
      .eq("titular_id", activeTitularId);
    titularCardIds = (titularCards ?? []).map((c) => c.id);
  }

  let query = supabase
    .from("expenses")
    .select("*, category:categories(*), card:cards(*)")
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .limit(200);

  if (titularCardIds) query = query.in("card_id", titularCardIds);
  if (filters.card_id) query = query.eq("card_id", filters.card_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.date_from) query = query.gte("expense_date", filters.date_from);
  if (filters.date_to) query = query.lte("expense_date", filters.date_to);
  if (filters.cuotas === "multi") query = query.gt("installments", 1);
  if (filters.cuotas === "single") query = query.eq("installments", 1);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  const [{ data: expensesData }, cardsResult, categoriesResult] =
    await Promise.all([
      query,
      (activeTitularId
        ? supabase
            .from("cards")
            .select("id, name, last_four")
            .eq("user_id", user!.id)
            .eq("archived", false)
            .eq("titular_id", activeTitularId)
            .order("name")
        : supabase
            .from("cards")
            .select("id, name, last_four")
            .eq("user_id", user!.id)
            .eq("archived", false)
            .order("name")),
      supabase
        .from("categories")
        .select("id, name, emoji")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .order("is_preset", { ascending: false })
        .order("name"),
    ]);

  const expenses = (expensesData ?? []) as ExpenseWithAll[];
  const filterCards = (cardsResult.data ?? []) as Pick<
    Card,
    "id" | "name" | "last_four"
  >[];
  const filterCategories = (categoriesResult.data ?? []) as Pick<
    Category,
    "id" | "name" | "emoji"
  >[];

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
        <MovimientosFilters
          basePath="/expenses"
          cards={filterCards.map((c) => ({
            id: c.id,
            label: `${c.name} ····${c.last_four}`,
          }))}
          categories={filterCategories.map((c) => ({
            id: c.id,
            label: `${c.emoji ?? ""} ${c.name}`.trim(),
          }))}
        />
      </div>

      <LiveSearch basePath="/expenses" placeholder="Buscar consumo" />

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
      href={`/expenses/${expense.id}${
        expense.card_id ? `?card_id=${expense.card_id}` : ""
      }`}
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
