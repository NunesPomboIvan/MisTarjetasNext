import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { EmptyState } from "@/components/shared/empty-state";
import { LoanList } from "@/components/loans/loan-list";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
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

  const items = allLoans.map((loan) => {
    const own = allInstallments.filter((i) => i.loan_id === loan.id);
    const paid = own.filter((i) => i.paid);
    const pending = own.filter((i) => !i.paid);
    return {
      loan,
      pendingAmount: pending.reduce((s, i) => s + Number(i.amount), 0),
      paidAmount: paid.reduce((s, i) => s + Number(i.amount), 0),
      paidCount: paid.length,
      totalCount: own.length,
    };
  });

  const active = items.filter((i) => !i.loan.archived);
  const archived = items.filter((i) => i.loan.archived);

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
            Préstamos
          </h1>
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
        <LoanList active={active} archived={archived} />
      )}
    </div>
  );
}
