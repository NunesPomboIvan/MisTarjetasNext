import Link from "next/link";
import { Calendar, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { getNextPayment, parseLocalDate } from "@/lib/periods/calculate";
import { formatDate, capitalize, nowInArgentina } from "@/lib/utils";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Próximos vencimientos" };

const ROW_STYLE = {
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  boxShadow:
    "0 0 28px -8px rgba(129,140,248,0.22), 0 14px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
} as const;

function daysLabel(daysUntil: number): { text: string; urgent: boolean } {
  if (daysUntil <= 0) return { text: "Vence hoy", urgent: true };
  return {
    text: `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
    urgent: daysUntil <= 3,
  };
}

export default async function VencimientosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTitularId = await getActiveTitularId();

  let cardsQuery = supabase
    .from("cards")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at");
  if (activeTitularId) cardsQuery = cardsQuery.eq("titular_id", activeTitularId);

  let loansQuery = supabase
    .from("loans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false);
  if (activeTitularId) loansQuery = loansQuery.eq("titular_id", activeTitularId);

  const [{ data: cards }, { data: expenses }, { data: loans }, { data: pendingInst }, { data: allInst }] =
    await Promise.all([
      cardsQuery,
      supabase.from("expenses").select("*").eq("user_id", user!.id),
      loansQuery,
      supabase
        .from("loan_installments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("paid", false)
        .order("due_date"),
      supabase.from("loan_installments").select("loan_id").eq("user_id", user!.id),
    ]);

  const allCards = (cards ?? []) as Card[];
  const allExpenses = (expenses ?? []) as Expense[];
  const allLoans = (loans ?? []) as Loan[];
  const pending = (pendingInst ?? []) as LoanInstallment[];

  const todayStart = startOfDay(nowInArgentina());

  // ── Tarjetas: próximo pago de cada tarjeta con saldo ──────────────
  const cardsUpcoming = allCards
    .map((card) => {
      const cardExpenses = allExpenses.filter((e) => e.card_id === card.id);
      const payment = getNextPayment(card, cardExpenses);
      if (!payment) return null;
      const daysUntil = differenceInCalendarDays(payment.period.due, todayStart);
      return { card, period: payment.period, total: payment.total, daysUntil };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());

  // ── Préstamos: próxima cuota pendiente de cada préstamo ───────────
  const loanById = new Map(allLoans.map((l) => [l.id, l]));
  const totalByLoan = new Map<string, number>();
  for (const i of allInst ?? []) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }
  const seenLoans = new Set<string>();
  const loansUpcoming = pending
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
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => {
      if (seenLoans.has(x.loan.id)) return false;
      seenLoans.add(x.loan.id);
      return true;
    });

  const cardsTotal = cardsUpcoming.reduce((s, u) => s + u.total, 0);
  const loansTotal = loansUpcoming.reduce((s, u) => s + Number(u.inst.amount), 0);
  const grandTotal = cardsTotal + loansTotal;
  const isEmpty = cardsUpcoming.length === 0 && loansUpcoming.length === 0;

  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="font-display text-[20px] font-semibold text-foreground">
            Próximos vencimientos
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </StickyPageHeader>

      {isEmpty ? (
        <EmptyState
          icon={<span>📅</span>}
          title="Sin vencimientos próximos"
          description="No tenés tarjetas ni cuotas de préstamos por vencer"
        />
      ) : (
        <>
          {/* Total general */}
          <section className="glass-card rounded-[20px] px-5 py-[18px]">
            <p className="text-[12px] font-medium text-muted-foreground">Próximo a vencer</p>
            <Money
              amount={grandTotal}
              className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
            />
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {cardsUpcoming.length} tarjeta{cardsUpcoming.length === 1 ? "" : "s"}
              {" · "}
              {loansUpcoming.length} préstamo{loansUpcoming.length === 1 ? "" : "s"}
            </p>
          </section>

          {/* Tarjetas */}
          {cardsUpcoming.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Tarjetas
                </h2>
                <Money
                  amount={cardsTotal}
                  className="text-[13px] font-semibold tabular-nums text-foreground"
                />
              </div>

              {cardsUpcoming.map(({ card, period, total, daysUntil }) => {
                const accent = card.color || "#6366f1";
                const { text, urgent } = daysLabel(daysUntil);
                return (
                  <Link
                    key={card.id}
                    href={`/cards/${card.id}`}
                    className="block rounded-[20px] border border-white/[0.08] bg-card/85 p-4 transition-all active:scale-[0.985]"
                    style={ROW_STYLE}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${accent}20`, color: accent }}
                      >
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-foreground">
                          {card.bank || card.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {capitalize(formatDate(period.due, "EEEE d 'de' MMM"))}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Money
                          amount={total}
                          className="block text-[15px] font-semibold tabular-nums text-foreground"
                        />
                        <p
                          className={
                            "mt-0.5 text-[11px] font-semibold " +
                            (urgent ? "text-destructive" : "text-muted-foreground")
                          }
                        >
                          {text}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

          {/* Préstamos */}
          {loansUpcoming.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Préstamos
                </h2>
                <Money
                  amount={loansTotal}
                  className="text-[13px] font-semibold tabular-nums text-foreground"
                />
              </div>

              {loansUpcoming.map(({ inst, loan, dueDate, daysUntil, totalForLoan }) => {
                const accent = loan.color || "#6366f1";
                const { text, urgent } = daysLabel(daysUntil);
                return (
                  <Link
                    key={inst.id}
                    href={`/prestamos/${loan.id}`}
                    className="block rounded-[20px] border border-white/[0.08] bg-card/85 p-4 transition-all active:scale-[0.985]"
                    style={ROW_STYLE}
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
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Cuota {inst.installment_number}/{totalForLoan} ·{" "}
                          {capitalize(formatDate(dueDate, "EEEE d 'de' MMM"))}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Money
                          amount={Number(inst.amount)}
                          className="block text-[15px] font-semibold tabular-nums text-foreground"
                        />
                        <p
                          className={
                            "mt-0.5 text-[11px] font-semibold " +
                            (urgent ? "text-destructive" : "text-muted-foreground")
                          }
                        >
                          {text}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
