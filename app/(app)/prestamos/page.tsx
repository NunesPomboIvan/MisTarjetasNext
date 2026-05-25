import Link from "next/link";
import { Banknote, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Préstamos bancarios" };

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [{ data: loans }, { data: installments }] = await Promise.all([
    loansQuery,
    supabase
      .from("loan_installments")
      .select("*")
      .eq("user_id", user!.id)
      .order("due_date"),
  ]);

  const allLoans = (loans ?? []) as Loan[];
  const allInstallments = (installments ?? []) as LoanInstallment[];

  const todayStart = startOfDay(nowInArgentina());

  const items = allLoans
    .map((loan) => {
      const own = allInstallments.filter((i) => i.loan_id === loan.id);
      const pending = own.filter((i) => !i.paid);
      const next = pending[0] ?? null;
      const totalRemaining = pending.reduce((s, i) => s + Number(i.amount), 0);
      const totalPaid = own
        .filter((i) => i.paid)
        .reduce((s, i) => s + Number(i.amount), 0);
      return { loan, next, totalRemaining, totalPaid, totalInstallments: own.length };
    })
    .sort((a, b) => {
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.due_date.localeCompare(b.next.due_date);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="font-display text-[20px] font-semibold text-foreground">
          Préstamos bancarios
        </h1>
        <Link
          href="/prestamos/new"
          aria-label="Nuevo préstamo"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<span>🏦</span>}
          title="Sin préstamos"
          description="Cargá tu primer préstamo para ver las cuotas próximas"
          action={{ label: "Nuevo préstamo", href: "/prestamos/new" }}
        />
      ) : (
        <section className="space-y-2.5">
          {items.map(({ loan, next, totalRemaining }) => {
            const accent = loan.color || "#6366f1";
            const daysUntil = next
              ? differenceInCalendarDays(parseLocalDate(next.due_date), todayStart)
              : null;
            return (
              <div
                key={loan.id}
                className="block rounded-[18px] border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    <Banknote className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {loan.bank || loan.description}
                    </p>
                    {loan.bank && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {loan.description}
                      </p>
                    )}
                    {next && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Próxima cuota:{" "}
                        {capitalize(formatDate(parseLocalDate(next.due_date), "d 'de' MMM"))}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <Money
                      amount={totalRemaining}
                      className="block text-[15px] font-semibold tabular-nums text-foreground"
                    />
                    {daysUntil != null && (
                      <p
                        className={
                          "mt-0.5 text-[11px] font-semibold " +
                          (daysUntil <= 3 ? "text-destructive" : "text-muted-foreground")
                        }
                      >
                        {daysUntil <= 0
                          ? "Vence hoy"
                          : `En ${daysUntil} día${daysUntil === 1 ? "" : "s"}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
