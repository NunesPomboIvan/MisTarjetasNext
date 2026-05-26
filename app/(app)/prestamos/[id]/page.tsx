import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { InstallmentsList } from "@/components/loans/installments-list";
import { DeleteLoanButton } from "@/components/loans/delete-loan-button";
import type { Loan, LoanInstallment } from "@/lib/supabase/database.types";

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Cuotas del préstamo" };

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: loan } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single<Loan>();

  if (!loan) notFound();

  const { data: installments } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("loan_id", id)
    .eq("user_id", user!.id)
    .order("installment_number");

  const all = (installments ?? []) as LoanInstallment[];
  const accent = loan.color || "#6366f1";

  return (
    <div className="space-y-5">
      {/* Header con el nombre del préstamo */}
      <div className="flex items-center justify-between gap-3">
        <BackButton />
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-semibold text-foreground">
            {loan.bank || loan.description}
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">Cuotas</p>
        </div>
        <DeleteLoanButton loanId={loan.id} loanName={loan.bank || loan.description} />
      </div>

      <InstallmentsList installments={all} accent={accent} />
    </div>
  );
}
