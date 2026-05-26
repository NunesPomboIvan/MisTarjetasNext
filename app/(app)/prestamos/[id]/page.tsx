import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { BackButton } from "@/components/shared/back-button";
import { InstallmentRow } from "@/components/loans/installment-row";
import { DeleteLoanButton } from "@/components/loans/delete-loan-button";
import { capitalize, formatDate } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import type { Loan, LoanInstallment } from "@/lib/supabase/database.types";

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Detalle de préstamo" };

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
  const total = all.length;
  const paid = all.filter((i) => i.paid);
  const pending = all.filter((i) => !i.paid);
  const nextPendingId = pending[0]?.id;

  const totalPaid = paid.reduce((s, i) => s + Number(i.amount), 0);
  const totalRemaining = pending.reduce((s, i) => s + Number(i.amount), 0);
  const progressPct = total > 0 ? Math.round((paid.length / total) * 100) : 0;

  const accent = loan.color || "#6366f1";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-[15px] font-semibold text-foreground">Detalle de préstamo</h1>
        <DeleteLoanButton loanId={loan.id} loanName={loan.bank || loan.description} />
      </div>

      {/* Resumen */}
      <section
        className="overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${accent}18 0%, transparent 60%), var(--card)`,
        }}
      >
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold leading-tight text-foreground">
            {loan.bank || loan.description}
          </p>
          {loan.bank && (
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground/70">Descripción:</span>{" "}
              {loan.description}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium text-muted-foreground">Pendiente</p>
            <Money
              amount={totalRemaining}
              className="mt-1 block text-[14px] font-bold leading-tight tabular-nums text-foreground"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium text-muted-foreground">Pagado</p>
            <Money
              amount={totalPaid}
              className="mt-1 block text-[14px] font-bold leading-tight tabular-nums"
              style={{ color: "#10b981" }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium text-muted-foreground">Total</p>
            <Money
              amount={Number(loan.total_amount)}
              className="mt-1 block text-[14px] font-bold leading-tight tabular-nums text-foreground"
            />
          </div>
        </div>

        {/* Progreso */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {paid.length} de {total} cuotas pagadas
            </span>
            <span className="font-semibold tabular-nums" style={{ color: accent }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: accent }}
            />
          </div>
        </div>

        {/* Fecha de emisión */}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Emitido el {capitalize(formatDate(parseLocalDate(loan.issue_date), "d 'de' MMM yyyy"))}
        </p>
      </section>

      {/* Cuotas */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] font-semibold text-foreground">
          Cuotas{" "}
          <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </h2>

        <div className="space-y-2">
          {all.map((i) => (
            <InstallmentRow
              key={i.id}
              installment={i}
              total={total}
              accent={accent}
              isNext={i.id === nextPendingId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
