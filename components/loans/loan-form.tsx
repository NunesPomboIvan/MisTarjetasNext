"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { format, addMonths } from "date-fns";
import { createLoan } from "@/actions/loans";
import { loanSchema, type LoanFormData } from "@/lib/schemas/loan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/expenses/amount-input";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ColorSwatchPicker } from "@/components/shared/color-swatch-picker";
import { ExchangeRateField } from "@/components/shared/exchange-rate-field";
import { cn } from "@/lib/utils";

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
  // true = el TC sigue al general (se actualiza si lo cambiás en Cuenta);
  // false = TC fijo para este préstamo. Sin TC general configurado no hay
  // nada que seguir, así que arranca fijo.
  const [rateFollowsGlobal, setRateFollowsGlobal] = useState(globalRate != null);
  const isUsd = currency === "USD";
  const amountPrefix = isUsd ? "US$" : "$";

  function changeCurrency(next: "ARS" | "USD") {
    setCurrency(next);
    if (next === "ARS") {
      setExchangeRate(null);
    } else if (exchangeRate == null && globalRate != null) {
      // Precargar el TC global al pasar a USD (editable si se pasa a "Fijo")
      setExchangeRate(globalRate);
      setRateFollowsGlobal(true);
    }
  }

  function changeRateMode(follows: boolean) {
    setRateFollowsGlobal(follows);
    if (follows && globalRate != null) setExchangeRate(globalRate);
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

  // Reset de los importes editados a mano cuando cambian total/cantidad.
  // Patrón "setState during render" (no useEffect) para no disparar renders en
  // cascada — mismo criterio que AmountInput.
  const [prevTotalCount, setPrevTotalCount] = useState<{ total: number | null; count: number }>({
    total,
    count,
  });
  if (prevTotalCount.total !== total || prevTotalCount.count !== count) {
    setPrevTotalCount({ total, count });
    setSimpleAmounts({});
  }

  // Errores por campo — mismo patrón visual que los formularios de tarjeta y
  // consumo (mensaje debajo del campo + borde rojo), en vez de un toast único.
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /** Mapea el path de un issue de Zod a la clave de campo del formulario. */
  function zodPathToKey(path: readonly PropertyKey[]): string {
    const [head, idx, sub] = path;
    if (head === "installments" && typeof idx === "number") {
      if (mode === "simple") return `simple.${idx}`;
      return sub === "due_date" ? `manual.${idx}.due_date` : `manual.${idx}.amount`;
    }
    if (head === "total_amount" || head === "installment_amount") return "total";
    if (head === "issue_date") return "issueDate";
    return String(head);
  }

  function focusFirstError(errs: Record<string, string>) {
    const order = ["description", "total", "count", "firstDue", "exchange_rate"];
    const key = order.find((k) => k in errs) ?? Object.keys(errs)[0];
    const idByKey: Record<string, string> = {
      description: "description",
      total: "total",
      count: "count",
      exchange_rate: "loan-exchange-rate",
    };
    const el = idByKey[key] ? document.getElementById(idByKey[key]) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const installments =
      mode === "simple"
        ? simpleInstallments
        : manual.map((m, i) => ({
            installment_number: i + 1,
            amount: m.amount ?? 0,
            due_date: m.due_date,
          }));

    const errs: Record<string, string> = {};

    if (!description.trim()) errs.description = "La descripción es requerida";

    if (mode === "simple") {
      if (!total || total <= 0) errs.total = "El importe debe ser mayor a 0";
      if (!count || count < 1 || count > 120) errs.count = "Entre 1 y 120 cuotas";
      if (!firstDue) errs.firstDue = "Elegí la fecha de la primera cuota";
      simpleInstallments.forEach((it, idx) => {
        if (!it.amount || it.amount <= 0) errs[`simple.${idx}`] = "Monto inválido";
      });
    } else {
      if (manual.length === 0) errs.installments = "Agregá al menos una cuota";
      manual.forEach((m, idx) => {
        if (!m.amount || m.amount <= 0) errs[`manual.${idx}.amount`] = "Ingresá el monto";
        if (!m.due_date) errs[`manual.${idx}.due_date`] = "Elegí la fecha";
      });
    }

    if (isUsd && !(exchangeRate && exchangeRate > 0)) {
      errs.exchange_rate = "Ingresá el tipo de cambio";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
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
      exchange_rate_custom: isUsd ? !rateFollowsGlobal : false,
      installments,
    };

    const parsed = loanSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = zodPathToKey(issue.path);
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      focusFirstError(errs);
      return;
    }

    setErrors({});
    save(parsed.data);
  }

  function save(data: LoanFormData) {
    startTransition(async () => {
      const result = await createLoan(data);
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            onChange={(e) => {
              setDescription(e.target.value);
              clearError("description");
            }}
            className={cn(errors.description && "border-destructive")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de emisión</Label>
          <DatePickerField value={issueDate} onChange={setIssueDate} />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap items-center gap-2">
            <ColorSwatchPicker colors={COLOR_PRESETS} value={color} onChange={setColor} />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color personalizado"
              aria-label="Elegir color personalizado"
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
              onChange={(v) => {
                setTotal(v ?? null);
                clearError("total");
              }}
              prefix={amountPrefix}
              size="lg"
              invalid={!!errors.total}
            />
            {errors.total && (
              <p className="text-xs text-destructive">{errors.total}</p>
            )}
          </div>

          {isUsd && (
            <ExchangeRateField
              id="loan-exchange-rate"
              value={exchangeRate}
              onChange={(v) => {
                setExchangeRate(v);
                clearError("exchange_rate");
              }}
              equivalentBase={total}
              globalRate={globalRate}
              followsGlobal={rateFollowsGlobal}
              onFollowsGlobalChange={changeRateMode}
              invalid={!!errors.exchange_rate}
              errorMessage={errors.exchange_rate}
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
              onChange={(e) => {
                setCount(parseInt(e.target.value || "0", 10) || 0);
                clearError("count");
              }}
              className={cn(errors.count && "border-destructive")}
            />
            {errors.count && (
              <p className="text-xs text-destructive">{errors.count}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Vencimiento primera cuota</Label>
            <DatePickerField
              value={firstDue}
              onChange={(v) => {
                setFirstDue(v);
                clearError("firstDue");
              }}
              placeholder="Elegí una fecha"
              className={cn(errors.firstDue && "border-destructive")}
            />
            {errors.firstDue && (
              <p className="text-xs text-destructive">{errors.firstDue}</p>
            )}
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
                        onChange={(v) => {
                          setSimpleAmounts((prev) => ({ ...prev, [idx]: v ?? 0 }));
                          clearError(`simple.${idx}`);
                        }}
                        prefix={amountPrefix}
                        invalid={!!errors[`simple.${idx}`]}
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
              id="loan-exchange-rate"
              value={exchangeRate}
              onChange={(v) => {
                setExchangeRate(v);
                clearError("exchange_rate");
              }}
              equivalentBase={manual.reduce((s, m) => s + (m.amount ?? 0), 0) || null}
              globalRate={globalRate}
              followsGlobal={rateFollowsGlobal}
              onFollowsGlobalChange={changeRateMode}
              invalid={!!errors.exchange_rate}
              errorMessage={errors.exchange_rate}
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

          {errors.installments && (
            <p className="text-xs text-destructive">{errors.installments}</p>
          )}

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
                      onChange={(v) => {
                        setManual((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, amount: v ?? null } : it))
                        );
                        clearError(`manual.${idx}.amount`);
                      }}
                      prefix={amountPrefix}
                      invalid={!!errors[`manual.${idx}.amount`]}
                    />
                    {errors[`manual.${idx}.amount`] && (
                      <p className="text-[11px] text-destructive">
                        {errors[`manual.${idx}.amount`]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Vencimiento</Label>
                    <DatePickerField
                      value={m.due_date}
                      onChange={(v) => {
                        setManual((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, due_date: v } : it))
                        );
                        clearError(`manual.${idx}.due_date`);
                      }}
                      className={cn(errors[`manual.${idx}.due_date`] && "border-destructive")}
                    />
                    {errors[`manual.${idx}.due_date`] && (
                      <p className="text-[11px] text-destructive">
                        {errors[`manual.${idx}.due_date`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
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
    </form>
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

