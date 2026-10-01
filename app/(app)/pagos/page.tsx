import { Banknote, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveTitularId } from "@/lib/titulares/server";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { AppHeader } from "@/components/shared/app-header";
import { PagosSwitch } from "@/components/vencimientos/pagos-switch";
import { getNextPayment, parseLocalDate, toArs } from "@/lib/periods/calculate";
import { nowInArgentina } from "@/lib/utils";
import { PagoRow } from "@/components/vencimientos/pago-row";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Card, Expense, Loan, LoanInstallment } from "@/lib/supabase/database.types";

export const metadata = { title: "Vencimientos" };

export default async function PagosPage() {
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

  const [{ data: cards }, { data: expenses }, { data: loans }, { data: allInst }] =
    await Promise.all([
      cardsQuery,
      supabase.from("expenses").select("*").eq("user_id", user!.id),
      loansQuery,
      supabase
        .from("loan_installments")
        .select("*")
        .eq("user_id", user!.id)
        .order("due_date"),
    ]);

  const allCards = (cards ?? []) as Card[];
  const allExpenses = (expenses ?? []) as Expense[];
  const allLoans = (loans ?? []) as Loan[];
  const installments = (allInst ?? []) as LoanInstallment[];

  const todayStart = startOfDay(nowInArgentina());

  // Tarjetas: próximo período con saldo, ordenadas por vencimiento.
  const cardUpcoming = allCards
    .map((card) => {
      const cardExpenses = allExpenses.filter((e) => e.card_id === card.id);
      const payment = getNextPayment(card, cardExpenses);
      if (!payment) return null;
      const daysUntil = differenceInCalendarDays(payment.period.due, todayStart);
      return { card, period: payment.period, total: payment.total, daysUntil };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.period.due.getTime() - b.period.due.getTime());

  // Préstamos: sólo la PRÓXIMA cuota pendiente de cada préstamo.
  const loanById = new Map(allLoans.map((l) => [l.id, l]));
  const totalByLoan = new Map<string, number>();
  for (const i of installments) {
    totalByLoan.set(i.loan_id, (totalByLoan.get(i.loan_id) ?? 0) + 1);
  }
  const seenLoans = new Set<string>();
  const loanUpcoming = installments
    .filter((i) => !i.paid)
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

  return (
    <div>
      <AppHeader title="Vencimientos" backHref="/" />

      <div className="mt-1">
        <PagosSwitch
          tarjetas={<CardsPanel items={cardUpcoming} />}
          prestamos={<LoansPanel items={loanUpcoming} />}
        />
      </div>
    </div>
  );
}

type CardItem = {
  card: Card;
  period: { due: Date };
  total: number;
  daysUntil: number;
};

function CardsPanel({ items }: { items: CardItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<span>📅</span>}
        title="Sin pagos pendientes"
        description="No tenés vencimientos próximos de tarjetas"
      />
    );
  }

  const total = items.reduce((s, u) => s + u.total, 0);

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-[20px] px-5 py-[18px]">
        <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
        <Money
          amount={total}
          className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {items.length} tarjeta{items.length === 1 ? "" : "s"} con vencimiento
        </p>
      </section>

      <section className="space-y-2.5">
        {items.map(({ card, period, total, daysUntil }) => (
          <PagoRow
            key={card.id}
            href={`/cards/${card.id}`}
            accent={card.color || "#6366f1"}
            icon={<Calendar className="h-5 w-5" />}
            title={card.bank || card.name}
            suffix={`•••• ${card.last_four}`}
            dueDate={period.due}
            amount={total}
            daysUntil={daysUntil}
          />
        ))}
      </section>
    </div>
  );
}

type LoanItem = {
  inst: LoanInstallment;
  loan: Loan;
  dueDate: Date;
  daysUntil: number;
  totalForLoan: number;
  amountArs: number;
};

function LoansPanel({ items }: { items: LoanItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<span>🏦</span>}
        title="Sin cuotas pendientes"
        description="No tenés cuotas de préstamos próximas a vencer"
      />
    );
  }

  const total = items.reduce((s, u) => s + u.amountArs, 0);

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-[20px] px-5 py-[18px]">
        <p className="text-[12px] font-medium text-muted-foreground">Total a pagar</p>
        <Money
          amount={total}
          className="mt-0.5 block font-display text-[28px] font-bold leading-none tracking-tight text-foreground"
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {items.length} préstamo{items.length === 1 ? "" : "s"} con cuota a vencer
        </p>
      </section>

      <section className="space-y-2.5">
        {items.map(({ inst, loan, dueDate, daysUntil, totalForLoan, amountArs }) => (
          <PagoRow
            key={inst.id}
            href={`/prestamos/${loan.id}`}
            accent={loan.color || "#6366f1"}
            icon={<Banknote className="h-5 w-5" />}
            title={loan.bank || loan.description}
            suffix={`Cuota ${inst.installment_number}/${totalForLoan}`}
            dueDate={dueDate}
            amount={amountArs}
            daysUntil={daysUntil}
          />
        ))}
      </section>
    </div>
  );
}
