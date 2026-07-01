import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/shared/money";
import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import {
  getCurrentPeriod,
  expenseFallsInPeriod,
  getAmountInPeriodArs,
} from "@/lib/periods/calculate";
import { formatDate, capitalize } from "@/lib/utils";
import type { ExpenseWithCategory } from "@/lib/supabase/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CardPagosPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!card) notFound();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, category:categories(*)")
    .eq("card_id", id)
    .eq("user_id", user!.id);

  const period = getCurrentPeriod(card);
  const periodExpenses = (expenses ?? []).filter((e) =>
    expenseFallsInPeriod(e, period)
  ) as ExpenseWithCategory[];

  const pagoTotal = periodExpenses.reduce(
    (s, e) => s + getAmountInPeriodArs(e, period),
    0
  );
  const pagoMinimo = Math.round(pagoTotal * 0.10);

  const today = new Date();
  const daysUntil = Math.ceil(
    (period.due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton href={`/cards/${id}`} />
          <h1 className="text-[15px] font-semibold text-foreground">Próximo pago</h1>
          <div className="w-10" />
        </div>
      </StickyPageHeader>

      {/* Próximo vencimiento card */}
      <section className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-muted-foreground">
              Próximo vencimiento
            </p>
            <p className="mt-0.5 font-display text-[22px] font-bold leading-tight text-foreground">
              {capitalize(formatDate(period.due, "d 'de' MMMM"))}
            </p>
            <p
              className={
                "mt-1 text-[13px] font-semibold " +
                (daysUntil <= 3 ? "text-destructive" : "text-primary")
              }
            >
              {daysUntil <= 0
                ? "Vence hoy"
                : `Faltan ${daysUntil} día${daysUntil === 1 ? "" : "s"}`}
            </p>
          </div>
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
        </div>
      </section>

      {/* Pago mínimo + Pago total */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[18px] border border-border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground">Pago mínimo</p>
          <Money
            amount={pagoMinimo}
            className="mt-1 block font-display text-[20px] font-bold leading-none text-foreground"
          />
        </div>
        <div className="rounded-[18px] border border-border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground">Pago total</p>
          <Money
            amount={pagoTotal}
            className="mt-1 block font-display text-[20px] font-bold leading-none text-foreground"
          />
        </div>
      </section>

      {/* Fecha */}
      <section className="rounded-[18px] border border-border bg-card p-4">
        <p className="text-[11px] font-medium text-muted-foreground">Fecha de pago</p>
        <p className="mt-1 text-[15px] font-semibold text-foreground">
          {formatDate(period.due, "d 'de' MMMM 'de' yyyy")}
        </p>
      </section>

      {/* Volver al detalle */}
      <Link
        href={`/cards/${id}`}
        className="flex items-center justify-center gap-2 text-[13px] font-semibold text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al detalle
      </Link>
    </div>
  );
}
