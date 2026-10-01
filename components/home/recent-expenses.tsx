import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Money } from "@/components/shared/money";
import { parseLocalDate } from "@/lib/periods/calculate";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import type { Category, Expense } from "@/lib/supabase/database.types";

export type RecentExpense = Expense & {
  category: Category | null;
  card: { name: string; bank: string | null } | null;
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "hoy", "ayer" o formato corto "29 sep" para la fecha de compra. */
function purchaseLabel(expenseDate: string, today: Date): string {
  const d = parseLocalDate(expenseDate);
  const diff = differenceInCalendarDays(today, d);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface RecentExpensesProps {
  expenses: RecentExpense[];
  /** Hoy en zona horaria de Argentina (para "hoy" / "ayer"). */
  today: Date;
}

/**
 * Últimos consumos cargados (orden por created_at), con acceso al listado
 * completo. La home se revalida desde las server actions de consumos
 * (revalidatePath("/", "layout")), así que la lista se actualiza sola al
 * cargar, editar o borrar.
 */
export function RecentExpenses({ expenses, today }: RecentExpensesProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Últimos consumos
        </h2>
        {expenses.length > 0 && (
          <Link
            href="/expenses"
            className="text-[12px] font-semibold text-primary transition-opacity active:opacity-70"
          >
            Ver todos →
          </Link>
        )}
      </div>

      <div className="glass-card rounded-[20px] px-5 py-1">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[13px] text-muted-foreground">Todavía no cargaste consumos</p>
            <Link
              href="/nuevo"
              className="btn-glass-primary inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold"
            >
              Cargar el primero
            </Link>
          </div>
        ) : (
          expenses.map((expense, i) => {
            const cat = expense.category;
            const cardName = expense.card ? expense.card.bank || expense.card.name : "";
            const amount = expense.recurring ? expense.installment_amount : expense.total_amount;
            return (
              <div key={expense.id}>
                {i > 0 && <div className="h-px bg-border dark:bg-white/[0.16]" />}
                <Link
                  href={`/expenses/${expense.id}`}
                  aria-label={`Ver consumo ${expense.description}`}
                  className="group flex w-full items-center gap-3 py-3 text-left"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[17px]"
                    style={{ background: cat ? cat.color_bg : "#6366f120" }}
                  >
                    {cat?.emoji ?? "🧾"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-tight text-foreground">
                      {expense.description}
                    </p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {cardName ? `${cardName} · ` : ""}
                      {purchaseLabel(expense.expense_date, today)}
                    </p>
                  </div>
                  <Money
                    amount={amount}
                    currency={expense.currency}
                    className={cn(
                      "flex-shrink-0 text-[14px] font-semibold tabular-nums text-foreground",
                      amount < 0 && "text-emerald-600 dark:text-emerald-400"
                    )}
                  />
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
