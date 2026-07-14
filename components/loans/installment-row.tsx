"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, LockOpen, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { toggleInstallmentPaid, updateInstallment } from "@/actions/loans";
import {
  setInstallmentRateOverride,
  clearInstallmentRateOverride,
} from "@/actions/exchange";
import { Money } from "@/components/shared/money";
import { AmountInput } from "@/components/expenses/amount-input";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatCurrency, formatDate, formatLongDate, nowInArgentina } from "@/lib/utils";
import { parseLocalDate } from "@/lib/periods/calculate";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Currency, LoanInstallment } from "@/lib/supabase/database.types";

interface InstallmentRowProps {
  installment: LoanInstallment;
  total: number;
  accent: string;
  /** true si esta cuota es la próxima pendiente del préstamo */
  isNext: boolean;
  /** Moneda del préstamo */
  currency?: Currency;
  /** TC global vigente (para "volver al general"). null = sin configurar */
  globalRate?: number | null;
}

export function InstallmentRow({
  installment,
  total,
  accent,
  isNext,
  currency = "ARS",
  globalRate = null,
}: InstallmentRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rateOpen, setRateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const paid = installment.paid;

  const isUsd = currency === "USD";
  const rate = installment.exchange_rate != null ? Number(installment.exchange_rate) : null;
  const rateCustom = !!installment.exchange_rate_custom;

  function toggle() {
    startTransition(async () => {
      const res = await toggleInstallmentPaid(installment.id, !paid);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  const dueDate = parseLocalDate(installment.due_date);
  const dueLabel = formatLongDate(dueDate);
  const daysUntil = differenceInCalendarDays(dueDate, startOfDay(nowInArgentina()));
  const isOverdue = !paid && daysUntil < 0;
  const isUrgent = !paid && daysUntil >= 0 && daysUntil <= 3;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-[14px] border p-3 transition-colors",
          paid
            ? "border-border/50 bg-muted/20 opacity-70"
            : isOverdue
              ? "border-destructive/40 bg-destructive/5"
              : isNext
                ? "border-border bg-card"
                : "border-border bg-card"
        )}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={paid ? "Marcar como impaga" : "Marcar como pagada"}
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
            paid
              ? "border-transparent text-white"
              : "border-border bg-transparent text-transparent hover:border-foreground/40"
          )}
          style={paid ? { background: accent } : undefined}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-foreground" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[13px] font-semibold tabular-nums",
              paid ? "text-muted-foreground line-through" : "text-foreground"
            )}
          >
            Cuota {installment.installment_number}/{total}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {paid && installment.paid_date
              ? `Pagada el ${formatDate(parseLocalDate(installment.paid_date), "d/M/yyyy")}`
              : `Vence ${dueLabel}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* TC de la cuota (préstamos en USD): candado cerrado = personalizado */}
            {isUsd && rate != null && (
              <button
                type="button"
                onClick={() => setRateOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  rateCustom
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                )}
                title={rateCustom ? "TC personalizado de esta cuota" : "Sigue el TC general"}
              >
                {rateCustom ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <LockOpen className="h-3 w-3" />
                )}
                TC {formatCurrency(rate)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              title="Editar monto o vencimiento de esta cuota"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <Money
            amount={Number(installment.amount)}
            currency={currency}
            className={cn(
              "block text-[14px] font-semibold tabular-nums",
              paid ? "text-muted-foreground line-through" : "text-foreground"
            )}
          />
          {isUsd && rate != null && (
            <p className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
              ≈ {formatCurrency(Number(installment.amount) * rate)}
            </p>
          )}
          {!paid && (
            <p
              className={cn(
                "mt-0.5 text-[10.5px] font-semibold",
                isOverdue
                  ? "text-destructive"
                  : isUrgent
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              {isOverdue
                ? `Venció hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) === 1 ? "" : "s"}`
                : daysUntil === 0
                  ? "Vence hoy"
                  : `Faltan ${daysUntil} día${daysUntil === 1 ? "" : "s"} para vencer`}
            </p>
          )}
        </div>
      </div>

      {isUsd && rate != null && (
        <InstallmentRateSheet
          open={rateOpen}
          onOpenChange={setRateOpen}
          installment={installment}
          total={total}
          rate={rate}
          custom={rateCustom}
          globalRate={globalRate}
        />
      )}

      <InstallmentEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        installment={installment}
        total={total}
        currency={currency}
      />
    </>
  );
}

/** Editor de monto y fecha de vencimiento de UNA cuota puntual */
function InstallmentEditSheet({
  open,
  onOpenChange,
  installment,
  total,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: LoanInstallment;
  total: number;
  currency: Currency;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number | undefined>(Number(installment.amount));
  const [dueDate, setDueDate] = useState(installment.due_date);

  const amountPrefix = currency === "USD" ? "US$" : "$";

  function save() {
    if (!(amount && amount > 0)) {
      toast.error("Ingresá un monto mayor a 0");
      return;
    }
    if (!dueDate) {
      toast.error("Elegí una fecha de vencimiento");
      return;
    }
    startTransition(async () => {
      const result = await updateInstallment(installment.id, {
        amount,
        due_date: dueDate,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuota actualizada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle>
            Editar cuota {installment.installment_number}/{total}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`inst-amount-${installment.id}`}>Monto</Label>
            <AmountInput
              id={`inst-amount-${installment.id}`}
              value={amount}
              onChange={setAmount}
              prefix={amountPrefix}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vencimiento</Label>
            <DatePickerField value={dueDate} onChange={setDueDate} />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              className="btn-glass-primary w-full"
              onClick={save}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="mr-1.5 h-4 w-4" />
              )}
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Editor del TC de UNA cuota: personalizar (bloquea) o volver al general */
function InstallmentRateSheet({
  open,
  onOpenChange,
  installment,
  total,
  rate,
  custom,
  globalRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: LoanInstallment;
  total: number;
  rate: number;
  custom: boolean;
  globalRate: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<number | null>(rate);

  function saveOverride() {
    if (!(draft && draft > 0)) {
      toast.error("Ingresá un tipo de cambio mayor a 0");
      return;
    }
    startTransition(async () => {
      const result = await setInstallmentRateOverride(installment.id, draft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tipo de cambio personalizado guardado");
      onOpenChange(false);
      router.refresh();
    });
  }

  function backToGlobal() {
    startTransition(async () => {
      const result = await clearInstallmentRateOverride(installment.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("La cuota vuelve a usar el tipo de cambio general");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle>
            Tipo de cambio · Cuota {installment.installment_number}/{total}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            {custom ? (
              <Lock className="h-4 w-4 flex-shrink-0 text-amber-500" />
            ) : (
              <LockOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <p className="text-[12px] text-muted-foreground">
              {custom
                ? "TC personalizado: los cambios del TC general no afectan esta cuota."
                : "Sigue el TC general: se recalcula cuando lo cambiás."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`inst-rate-${installment.id}`}>
              Tipo de cambio (ARS por 1 USD)
            </Label>
            <Input
              id={`inst-rate-${installment.id}`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={draft ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft(e.target.value === "" || isNaN(n) ? null : n);
              }}
            />
            {draft ? (
              <p className="text-xs text-muted-foreground">
                Cuota de {formatCurrency(Number(installment.amount), "USD")} ≈{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(Number(installment.amount) * draft)}
                </span>{" "}
                en pesos
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              className="btn-glass-primary w-full"
              onClick={saveOverride}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-1.5 h-4 w-4" />
              )}
              Personalizar tipo de cambio
            </Button>
            {custom && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={backToGlobal}
                disabled={isPending || globalRate == null}
                title={
                  globalRate == null
                    ? "Configurá primero el TC general en Cuenta → Tipo de cambio"
                    : undefined
                }
              >
                <LockOpen className="mr-1.5 h-4 w-4" />
                Volver a usar tipo de cambio general
                {globalRate != null && ` (${formatCurrency(globalRate)})`}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
