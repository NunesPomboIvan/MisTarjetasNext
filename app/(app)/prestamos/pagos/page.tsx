import Link from "next/link";
import { Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { nowInArgentina, formatWeekdayLongDate } from "@/lib/utils";
import { parseLocalDate, toArs } from "@/lib/periods/calculate";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Préstamos a vencer" };

export default async function PrestamosPagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false);
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [{ data: loans }, { data: installments }] = await Promise.all([
    loansQuery,
    supabase
      .from("loan_installments")
      .select("*")
      .eq("user_id", user!.id)
      .eq("paid", false)
      .order("due_date"),
  ]);

  const allLoans = (loans ?? []) as Loan[];
  const pending = (installments ?? []) as LoanInstallment[];

  const loanById = new Map(allLoans.map((l) => [l.id, l]));
  // Total de cuotas por préstamo (para mostrar "Cuota X/N"). Necesita una
  // consulta extra porque arriba sólo traemos las no pagadas.
  const { data: allInst } = await supabase
    .from("loan_installments")
    .select("loan_id")
    .eq("user_id", user!.id);
  const totalByLoan = new Map<string, number>();
  for (const i of allInst ?? []) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }

  const todayStart = startOfDay(nowInArgentina());

  // Solo la PRÓXIMA cuota a vencer de cada préstamo. Como `pending` viene
  // ordenado por due_date asc, la primera que aparece de cada préstamo es la
  // más próxima; descartamos las siguientes del mismo préstamo.
  const seenLoans = new Set<string>();
  const upcoming = pending
    .map((inst) => {
      const loan = loanById.get(inst.loan_id);
      if (!loan) return null;
      const dueDate = parseLocalDate(inst.due_date);
      return {
        inst,
        loan,
        dueDate,
        daysUntil: differenceInCalendarDays(dueDate, todayStart),
        totalForLoan: totalByLoan.get(inst.loan_id) ?? inst.installment_number,
        // Cuotas en USD: convertidas a pesos con el TC efectivo de la cuota.
        amountArs: toArs(
          { currency: loan.currency, exchange_rate: inst.exchange_rate },
          Number(inst.amount)
        ),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => {
      if (seenLoans.has(x.loan.id)) return false;
      seenLoans.add(x.loan.id);
      return true;
    });

  const totalAPagar = upcoming.reduce((s, u) => s + u.amountArs, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href="/prestamos" />
          <h1 className="font-display text-[20px] font-semibold text-foreground">
            Préstamos a vencer
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </StickyPageHeader>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<span>🏦</span>}
          title="Sin cuotas pendientes"
          description="No tenés cuotas próximas a vencer"
        />
      ) : (
        <>
          {/* Total a pagar — mismo look que el saldo del home */}
          <section className="glass-card rounded-[20px] px-5 py-[18px]">
            <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
            <Money
              amount={totalAPagar}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
            />
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {upcoming.length} préstamo{upcoming.length === 1 ? "" : "s"} con cuota a vencer
            </p>
          </section>

          {/* Lista de cuotas próximas */}
          <section className="space-y-2.5">
            {upcoming.map(({ inst, loan, dueDate, daysUntil, totalForLoan, amountArs }) => {
              const isToday = daysUntil <= 0;
              const isUrgent = daysUntil <= 1;
              const accent = loan.color || "#6366f1";
              return (
                <Link
                  key={inst.id}
                  href={`/prestamos/${loan.id}`}
                  className="block rounded-[20px] border border-white/[0.08] bg-card/85 p-4 backdrop-blur-xl transition-all active:scale-[0.985]"
                  style={{
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    boxShadow:
                      "0 0 28px -8px rgba(129,140,248,0.22), 0 14px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
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
                        <span className="ml-1.5 text-[12px] font-normal tabular-nums text-muted-foreground">
                          Cuota {inst.installment_number}/{totalForLoan}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatWeekdayLongDate(dueDate)}
                      </p>
                      <Money
                        amount={amountArs}
                        className="mt-1 block text-[13px] font-semibold tabular-nums text-foreground"
                      />
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {isToday ? (
                        <p
                          className={
                            "font-display text-[15px] font-bold leading-none " +
                            (isUrgent ? "text-destructive" : "text-foreground")
                          }
                        >
                          Hoy
                        </p>
                      ) : (
                        <div className="flex items-baseline justify-end gap-1">
                          <p
                            className={
                              "font-display text-[18px] font-bold leading-none tabular-nums " +
                              (isUrgent ? "text-destructive" : "text-foreground")
                            }
                          >
                            {daysUntil}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {daysUntil === 1 ? "día" : "días"}
                          </p>
                        </div>
                      )}
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        para vencer
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
