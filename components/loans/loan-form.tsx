"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { format, addMonths } from "date-fns";
import { createLoan } from "@/actions/loans";
import { loanSchema } from "@/lib/schemas/loan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/expenses/amount-input";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { cn, formatCurrency } from "@/lib/utils";

const COLOR_PRESETS = [
  "#6366f1", "#f97316", "#ef4444", "#eab308",
  "#1a7a46", "#3b82f6", "#8b5cf6", "#ec4899",
];

type Mode = "simple" | "manual";

interface ManualInstallment {
  amount: number | null;
  due_date: string;
}

interface LoanFormProps {
  /** TC global vigente (ARS por 1 USD) para precargar al elegir USD. null = sin configurar */
  globalRate?: number | null;
}

export function LoanForm({ globalRate = null }: LoanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("simple");

  const [description, setDescription] = useState("");
  const [bank, setBank] = useState("");
  const [color, setColor] = useState<string>("#6366f1");
  const [issueDate, setIssueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Moneda + tipo de cambio (USD)
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const isUsd = currency === "USD";
  const amountPrefix = isUsd ? "US$" : "$";

  function changeCurrency(next: "ARS" | "USD") {
    setCurrency(next);
    if (next === "ARS") setExchangeRate(null);
    // Precargar el TC global al pasar a USD (editable)
    else if (exchangeRate == null && globalRate != null) setExchangeRate(globalRate);
  }

  // Simple mode
  const [total, setTotal] = useState<number | null>(null);
  const [count, setCount] = useState<number>(12);
  const [firstDue, setFirstDue] = useState<string>("");
  const [simpleAmounts, setSimpleAmounts] = useState<Record<number, number>>({});

  // Manual mode
  const [manual, setManual] = useState<ManualInstallment[]>([
    { amount: null, due_date: format(new Date(), "yyyy-MM-dd") },
  ]);

  // Cuotas pre-calculadas en modo simple
  const simpleInstallments = useMemo(() => {
    if (mode !== "simple" || !total || !count || !firstDue) return [];
    const base = +(total / count).toFixed(2);
    const first = new Date(firstDue + "T00:00:00");
    return Array.from({ length: count }, (_, i) => {
      const due = addMonths(first, i);
      return {
        installment_number: i + 1,
        amount: simpleAmounts[i] ?? base,
        due_date: format(due, "yyyy-MM-dd"),
      };
    });
  }, [mode, total, count, firstDue, simpleAmounts]);

  // Reset edits cuando cambian total/count
  useEffect(() => {
    setSimpleAmounts({});
  }, [total, count]);

  function submit() {
    // Construir lista final de cuotas según modo
    const installments =
      mode === "simple"
        ? simpleInstallments
        : manual.map((m, i) => ({
            installment_number: i + 1,
            amount: m.amount ?? 0,
            due_date: m.due_date,
          }));

    if (installments.length === 0) {
      toast.error("Agregá al menos una cuota");
      return;
    }
    if (installments.some((i) => !i.amount || i.amount <= 0)) {
      toast.error("Todas las cuotas deben tener monto");
      return;
    }
    if (installments.some((i) => !i.due_date)) {
      toast.error("Todas las cuotas deben tener fecha de vencimiento");
      return;
    }
    if (isUsd && !(exchangeRate && exchangeRate > 0)) {
      toast.error("Ingresá el tipo de cambio");
      return;
    }

    const totalAmount =
      mode === "simple"
        ? total!
        : +installments.reduce((s, i) => s + i.amount, 0).toFixed(2);

    const installmentBase =
      mode === "simple" ? +(totalAmount / count).toFixed(2) : installments[0].amount;

    const payload = {
      description,
      bank: bank || null,
      color,
      titular_id: null,
      total_amount: totalAmount,
      installment_amount: installmentBase,
      issue_date: issueDate,
      currency,
      exchange_rate: isUsd ? exchangeRate : null,
      installments,
    };

    const parsed = loanSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }

    startTransition(async () => {
      const result = await createLoan(parsed.data);
      if (result.success) {
        toast.success("Préstamo creado");
        router.push("/prestamos");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Tabs Simple / Manual */}
      <div className="flex rounded-[14px] border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("simple")}
          className={cn(
            "flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",
            mode === "simple"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Monto total
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "flex-1 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",
            mode === "manual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Cuotas manuales
        </button>
      </div>

      {/* Datos del préstamo */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bank">Banco o entidad</Label>
          <Input
            id="bank"
            placeholder="Ej: Galicia, Santander…"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="Ej: Préstamo personal auto"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de emisión</Label>
          <DatePickerField value={issueDate} onChange={setIssueDate} />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color personalizado"
            />
          </div>
        </div>
      </div>

      {/* Modo simple */}
      {mode === "simple" && (
        <div className="space-y-4 rounded-[16px] border border-border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="total">Importe total del préstamo</Label>
              <CurrencyToggle value={currency} onChange={changeCurrency} />
            </div>
            <AmountInput
              id="total"
              value={total}
              onChange={(v) => setTotal(v ?? null)}
              prefix={amountPrefix}
              size="lg"
            />
          </div>

          {isUsd && (
            <ExchangeRateField
              value={exchangeRate}
              onChange={setExchangeRate}
              equivalentBase={total}
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="count">Cantidad de cuotas</Label>
            <Input
              id="count"
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "0", 10) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vencimiento primera cuota</Label>
            <DatePickerField
              value={firstDue}
              onChange={setFirstDue}
              placeholder="Elegí una fecha"
            />
          </div>

          {simpleInstallments.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cuotas ({simpleInstallments.length})
              </p>
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {simpleInstallments.map((i, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-[12px] border border-border bg-card p-2"
                  >
                    <span className="w-7 shrink-0 text-center text-[12px] font-semibold text-muted-foreground tabular-nums">
                      {i.installment_number}
                    </span>
                    <div className="flex-1">
                      <AmountInput
                        value={i.amount}
                        onChange={(v) =>
                          setSimpleAmounts((prev) => ({ ...prev, [idx]: v ?? 0 }))
                        }
                        prefix={amountPrefix}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-[78px] text-right">
                      {format(new Date(i.due_date + "T00:00:00"), "dd/MM/yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo manual */}
      {mode === "manual" && (
        <div className="space-y-3 rounded-[16px] border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">Cuotas</p>
            <CurrencyToggle value={currency} onChange={changeCurrency} />
          </div>

          {isUsd && (
            <ExchangeRateField
              value={exchangeRate}
              onChange={setExchangeRate}
              equivalentBase={manual.reduce((s, m) => s + (m.amount ?? 0), 0) || null}
            />
          )}

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setManual((prev) => {
                  const last = prev[prev.length - 1];
                  const nextDue = last?.due_date
                    ? format(addMonths(new Date(last.due_date + "T00:00:00"), 1), "yyyy-MM-dd")
                    : format(new Date(), "yyyy-MM-dd");
                  return [...prev, { amount: null, due_date: nextDue }];
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Cuota
            </Button>
          </div>

          <div className="space-y-2">
            {manual.map((m, idx) => (
              <div
                key={idx}
                className="rounded-[12px] border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cuota {idx + 1}
                  </span>
                  {manual.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setManual((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Monto</Label>
                    <AmountInput
                      value={m.amount}
                      onChange={(v) =>
                        setManual((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, amount: v ?? null } : it))
                        )
                      }
                      prefix={amountPrefix}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Vencimiento</Label>
                    <DatePickerField
                      value={m.due_date}
                      onChange={(v) =>
                        setManual((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, due_date: v } : it))
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="button"
        onClick={submit}
        className="btn-glass-primary w-full font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Crear préstamo
          </>
        )}
      </Button>
    </div>
  );
}

/** Selector compacto de moneda: Pesos (ARS) / Dólares (USD) — mismo patrón que consumos */
function CurrencyToggle({
  value,
  onChange,
}: {
  value: "ARS" | "USD";
  onChange: (v: "ARS" | "USD") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
      {(["ARS", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            value === c
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {c === "ARS" ? "$ Pesos" : "US$ Dólar"}
        </button>
      ))}
    </div>
  );
}

/** Campo de tipo de cambio (sólo USD), con el equivalente en pesos como ayuda */
function ExchangeRateField({
  value,
  onChange,
  equivalentBase,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Monto en USD para mostrar el equivalente en pesos (null = sin hint) */
  equivalentBase: number | null;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
      <Label htmlFor="loan-exchange-rate">Tipo de cambio (ARS por 1 USD)</Label>
      <Input
        id="loan-exchange-rate"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="Ej: 1200"
        value={value ?? ""}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(e.target.value === "" || isNaN(n) ? null : n);
        }}
      />
      {equivalentBase && value ? (
        <p className="text-xs text-muted-foreground">
          Equivale a{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(equivalentBase * value)}
          </span>{" "}
          en pesos
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Se usa para sumar las cuotas en pesos en los totales.
        </p>
      )}
    </div>
  );
}
