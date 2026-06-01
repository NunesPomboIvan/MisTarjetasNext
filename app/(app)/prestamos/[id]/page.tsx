import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
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
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-3">
          <BackButton />
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[15px] font-semibold text-foreground">
              {loan.bank || loan.description}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">Cuotas</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Link
              href={`/prestamos/${loan.id}/edit`}
              aria-label="Editar préstamo"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              <Pencil className="h-[18px] w-[18px]" />
            </Link>
            <DeleteLoanButton loanId={loan.id} loanName={loan.bank || loan.description} />
          </div>
        </div>
      </StickyPageHeader>

      <InstallmentsList installments={all} accent={accent} />
    </div>
  );
}
