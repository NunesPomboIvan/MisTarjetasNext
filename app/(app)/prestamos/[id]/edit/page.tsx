import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { BackButton } from "@/components/shared/back-button";
import { LoanEditForm } from "@/components/loans/loan-edit-form";
import type { Loan } from "@/lib/supabase/database.types";

export const metadata = { title: "Editar préstamo" };

export default async function EditLoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton href={`/prestamos/${id}`} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Editar préstamo</h1>
            <p className="truncate text-sm text-muted-foreground">
              {loan.bank || loan.description}
            </p>
          </div>
        </div>
      </StickyPageHeader>

      <div className="rounded-2xl border border-border bg-card p-5">
        <LoanEditForm
          loanId={loan.id}
          initial={{
            description: loan.description,
            bank: loan.bank,
            color: loan.color,
            issue_date: loan.issue_date,
            currency: loan.currency,
            exchange_rate: loan.exchange_rate,
          }}
        />
      </div>
    </div>
  );
}
