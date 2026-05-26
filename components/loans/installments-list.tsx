"use client";

import { useMemo, useState } from "react";
import { Money } from "@/components/shared/money";
import { InstallmentRow } from "@/components/loans/installment-row";
import { cn } from "@/lib/utils";
import type { LoanInstallment } from "@/lib/supabase/database.types";

type Filter = "all" | "pending" | "paid";

interface InstallmentsListProps {
  installments: LoanInstallment[];
  accent: string;
}

export function InstallmentsList({ installments, accent }: InstallmentsListProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const paid = installments.filter((i) => i.paid);
    const pending = installments.filter((i) => !i.paid);
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      paidAmount: paid.reduce((s, i) => s + Number(i.amount), 0),
      pendingAmount: pending.reduce((s, i) => s + Number(i.amount), 0),
    };
  }, [installments]);

  const filtered = useMemo(() => {
    if (filter === "paid") return installments.filter((i) => i.paid);
    if (filter === "pending") return installments.filter((i) => !i.paid);
    return installments;
  }, [installments, filter]);

  const nextPendingId = useMemo(
    () => installments.find((i) => !i.paid)?.id,
    [installments]
  );

  const total = installments.length;

  return (
    <section className="space-y-3">
      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[14px] border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Pagadas
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-foreground tabular-nums">
            {stats.paidCount}
          </p>
          <Money
            amount={stats.paidAmount}
            className="mt-0.5 block text-[11.5px] font-semibold tabular-nums"
            style={{ color: "#10b981" }}
          />
        </div>
        <div className="rounded-[14px] border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Pendientes
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-foreground tabular-nums">
            {stats.pendingCount}
          </p>
          <Money
            amount={stats.pendingAmount}
            className="mt-0.5 block text-[11.5px] font-semibold tabular-nums text-foreground"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex rounded-[14px] border border-border bg-muted/40 p-1">
        <FilterTab label={`Todas (${total})`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterTab
          label={`Pendientes (${stats.pendingCount})`}
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
        />
        <FilterTab
          label={`Pagadas (${stats.paidCount})`}
          active={filter === "paid"}
          onClick={() => setFilter("paid")}
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-card px-4 py-6 text-center text-[12px] text-muted-foreground">
          No hay cuotas en este filtro
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <InstallmentRow
              key={i.id}
              installment={i}
              total={total}
              accent={accent}
              isNext={i.id === nextPendingId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[10px] px-2 py-1.5 text-[11.5px] font-semibold transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
