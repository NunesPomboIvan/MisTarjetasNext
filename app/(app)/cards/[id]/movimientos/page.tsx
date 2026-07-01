import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { LiveSearch } from "@/components/expenses/live-search";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { MovimientosFilters } from "@/components/expenses/movimientos-filters";
import { getCurrentPeriod, expenseFallsInPeriod, getAmountInPeriodArs, getInstallmentIndexInPeriod, getInstallmentAmountForIndex, toArs } from "@/lib/periods/calculate";
import { formatDate, capitalize } from "@/lib/utils";
import type { ExpenseWithCategory, Category } from "@/lib/supabase/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    category_id?: string;
    date_from?: string;
    date_to?: string;
    cuotas?: string;
  }>;
}

export default async function CardMovimientosPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { q, category_id, date_from, date_to, cuotas } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!card) notFound();

  let query = supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("description", `%${q}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (date_from) query = query.gte("expense_date", date_from);
  if (date_to) query = query.lte("expense_date", date_to);
  if (cuotas === "multi") query = query.gt("installments", 1);
  if (cuotas === "single") query = query.eq("installments", 1);

  const [{ data: expenses }, categoriesResult] = await Promise.all([
    query,
    supabase
      .from("categories")
      .select("id, name, emoji")
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order("is_preset", { ascending: false })
      .order("name"),
  ]);
  const all = (expenses ?? []) as ExpenseWithCategory[];
  const filterCategories = (categoriesResult.data ?? []) as Pick<
    Category,
    "id" | "name" | "emoji"
  >[];

  const currentPeriod = getCurrentPeriod(card);
  const pendientes = all.filter((e) => expenseFallsInPeriod(e, currentPeriod));
  const pendientesTotal = pendientes.reduce(
    (s, e) => s + getAmountInPeriodArs(e, currentPeriod),
    0
  );

  // Movimientos de meses anteriores agrupados por mes
  const previousByMonth: Record<string, ExpenseWithCategory[]> = {};
  for (const e of all) {
    if (expenseFallsInPeriod(e, currentPeriod)) continue;
    const key = e.expense_date.slice(0, 7);
    if (!previousByMonth[key]) previousByMonth[key] = [];
    previousByMonth[key].push(e);
  }

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href={`/cards/${id}`} />
          <h1 className="text-[15px] font-semibold text-foreground">Movimientos</h1>
          <MovimientosFilters
            basePath={`/cards/${id}/movimientos`}
            categories={filterCategories.map((c) => ({
              id: c.id,
              label: `${c.emoji ?? ""} ${c.name}`.trim(),
            }))}
          />
        </div>
      </StickyPageHeader>

      <LiveSearch basePath={`/cards/${id}/movimientos`} placeholder="Buscar consumo" />

      {all.length === 0 ? (
        <EmptyState
          icon={<span>🧾</span>}
          title="Sin movimientos"
          description="Agregá un consumo para que aparezca acá"
          action={{ label: "Agregar consumo", href: `/expenses/new?card_id=${id}` }}
        />
      ) : (
        <div className="space-y-5">
          {pendientes.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[13px] font-semibold text-foreground">Pendientes</h2>
                <Money
                  amount={pendientesTotal}
                  className="text-[13px] font-semibold tabular-nums text-foreground"
                />
              </div>
              <div className="overflow-hidden rounded-[18px] border border-border bg-card">
                {pendientes.map((exp, i) => (
                  <CardExpenseRow
                    key={exp.id}
                    expense={exp}
                    cardId={id}
                    showInstallment
                    installmentIndex={getInstallmentIndexInPeriod(exp, currentPeriod)}
                    pendingBadge
                    isLast={i === pendientes.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {Object.entries(previousByMonth).map(([month, items]) => {
            const total = items.reduce((s, e) => s + toArs(e, e.installment_amount), 0);
            const monthLabel = capitalize(
              formatDate(month + "-01T00:00:00", "MMMM yyyy")
            );
            return (
              <section key={month}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-semibold text-foreground">{monthLabel}</h2>
                  <Money
                    amount={total}
                    className="text-[13px] font-semibold tabular-nums text-foreground"
                  />
                </div>
                <div className="overflow-hidden rounded-[18px] border border-border bg-card">
                  {items.map((exp, i) => (
                    <CardExpenseRow
                      key={exp.id}
                      expense={exp}
                      cardId={id}
                      isLast={i === items.length - 1}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* FAB agregar */}
      <Link
        href={`/expenses/new?card_id=${id}`}
        aria-label="Nuevo movimiento"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-[20px] gradient-primary text-white shadow-brand-glow transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

function CardExpenseRow({
  expense,
  cardId,
  isLast,
  showInstallment,
  installmentIndex,
  pendingBadge,
}: {
  expense: ExpenseWithCategory;
  cardId: string;
  isLast: boolean;
  showInstallment?: boolean;
  installmentIndex?: number;
  pendingBadge?: boolean;
}) {
  const cat = expense.category;
  const hasInstallmentContext =
    showInstallment && expense.installments > 1 && installmentIndex != null && installmentIndex >= 0;
  const installmentSuffix = hasInstallmentContext
    ? ` · Cuota ${installmentIndex! + 1}/${expense.installments}`
    : "";
  // Importe a mostrar: si conocemos la cuota del período, respetar su override
  const rowAmount = hasInstallmentContext
    ? getInstallmentAmountForIndex(expense, installmentIndex!)
    : expense.installment_amount;

  const params = new URLSearchParams({ card_id: cardId });
  if (installmentIndex != null && installmentIndex >= 0) {
    params.set("installment", String(installmentIndex));
  }

  return (
    <Link
      href={`/expenses/${expense.id}?${params.toString()}`}
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
          {cat?.name ?? "Sin categoría"}{installmentSuffix}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <Money
          amount={rowAmount}
          currency={expense.currency}
          className="block text-[14px] font-semibold tabular-nums text-foreground"
        />
        {pendingBadge ? (
          <p className="mt-0.5 text-[10.5px] font-semibold text-amber-600">Pendiente</p>
        ) : (
          <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
            {formatDate(expense.expense_date + "T00:00:00", "d MMM")}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
