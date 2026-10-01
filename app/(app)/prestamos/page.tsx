import Link from "next/link";
import { Banknote, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanList } from "@/components/loans/loan-list";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { PagoRow } from "@/components/vencimientos/pago-row";
import { nowInArgentina } from "@/lib/utils";
import { parseLocalDate, toArs } from "@/lib/periods/calculate";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Préstamos" };

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [{ data: loans }, { data: installments }] = await Promise.all([
    loansQuery,
    supabase
      .from("loan_installments")
      .select("*")
      .eq("user_id", user!.id),
  ]);

  const allLoans = (loans ?? []) as Loan[];
  const allInstallments = (installments ?? []) as LoanInstallment[];

  const today = startOfDay(nowInArgentina());
  const items = allLoans.map((loan) => {
    const own = allInstallments.filter((i) => i.loan_id === loan.id);
    const paid = own.filter((i) => i.paid);
    const pending = own.filter((i) => !i.paid);
    const overdueCount = pending.filter(
      (i) => parseLocalDate(i.due_date) < today
    ).length;
    return {
      loan,
      pendingAmount: pending.reduce((s, i) => s + Number(i.amount), 0),
      paidAmount: paid.reduce((s, i) => s + Number(i.amount), 0),
      paidCount: paid.length,
      totalCount: own.length,
      overdueCount,
    };
  });

  const active = items.filter((i) => !i.loan.archived);
  const archived = items.filter((i) => i.loan.archived);

  // Próximos vencimientos: la próxima cuota pendiente de cada préstamo activo,
  // ordenadas por fecha (mismo criterio que la pantalla de Vencimientos).
  const upcoming = active
    .map(({ loan, totalCount }) => {
      const next = allInstallments
        .filter((i) => i.loan_id === loan.id && !i.paid)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
      if (!next) return null;
      const dueDate = parseLocalDate(next.due_date);
      return {
        loan,
        inst: next,
        totalCount,
        dueDate,
        daysUntil: differenceInCalendarDays(dueDate, today),
        amountArs: toArs(
          { currency: loan.currency, exchange_rate: next.exchange_rate },
          Number(next.amount)
        ),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
              Préstamos
            </h1>
            <span className="inline-flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[12px] font-bold tabular-nums text-primary">
              {active.length}
            </span>
            <span className="flex-shrink-0 text-[13px] font-medium text-muted-foreground">
              activo{active.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Link
            href="/prestamos/new"
            className="btn-glass-primary inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Link>
        </div>
      </StickyPageHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={<span>🏦</span>}
          title="Todavía no tenés préstamos"
          description="Cargá tu primer préstamo bancario para empezar a hacer seguimiento"
          action={{ label: "Nuevo préstamo", href: "/prestamos/new" }}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Próximos vencimientos
              </h2>
              <div className="space-y-2.5">
                {upcoming.map(({ loan, inst, totalCount, dueDate, daysUntil, amountArs }) => (
                  <PagoRow
                    key={inst.id}
                    href={`/prestamos/${loan.id}`}
                    accent={loan.color || "#6366f1"}
                    icon={<Banknote className="h-5 w-5" />}
                    title={loan.bank || loan.description}
                    suffix={`Cuota ${inst.installment_number}/${totalCount}`}
                    dueDate={dueDate}
                    amount={amountArs}
                    daysUntil={daysUntil}
                  />
                ))}
              </div>
            </section>
          )}
          <LoanList active={active} archived={archived} />
        </>
      )}
    </div>
  );
}
