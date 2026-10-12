"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ChevronDown, Loader2, Plus, Repeat, X } from "lucide-react";

import { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense";
import {
  calculateInstallmentBreakdown,
  type DiscountDistribution,
} from "@/lib/expenses/installments";
import { createExpense } from "@/actions/expenses";
import { createCategory } from "@/actions/categories";
import { useLastCard } from "@/lib/hooks/use-last-card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { DescriptionAutocomplete } from "./description-autocomplete";
import { AmountInput } from "./amount-input";
import { InstallmentPresets } from "./installment-presets";
import { AmountHero } from "@/components/shared/amount-hero";
import { ExchangeRateField } from "@/components/shared/exchange-rate-field";
import { GuardedLink } from "@/components/shared/guarded-link";
import { useUnsavedChangesGuard } from "@/components/shared/navigation-blocker";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  FIELD_BUTTON,
  FIELD_CARD,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_ROW,
  fieldOption,
} from "@/components/shared/field-styles";
import { cn, formatCurrency } from "@/lib/utils";
import { CARD_TYPE_LABEL } from "@/lib/cards/card-type-label";
import type { Card, Category } from "@/lib/supabase/database.types";

/** "Visa · Macro 4016": red, separador, nombre y últimos 4 dígitos. */
function cardLabel(card: Card): string {
  const rest = [card.name, card.last_four].filter(Boolean).join(" ");
  return [CARD_TYPE_LABEL[card.type], rest].filter(Boolean).join(" · ");
}


interface NewExpenseHeroProps {
  cards: Card[];
  categories: Category[];
  defaultCardId?: string;
  /** Modo "gastos de tarjeta": preselecciona la categoría y muestra chips rápidos */
  feeMode?: boolean;
  /** TC global vigente (ARS por 1 USD) para precargar al elegir USD. null = sin configurar */
  globalRate?: number | null;
  /** Arranca el form como "consumo fijo mensual" (recurrente) */
  recurringMode?: boolean;
  /**
   * Id del `<form>`: lo usa el botón de guardar fijo del shell (que vive fuera
   * del form) para dispararlo con `requestSubmit()`.
   */
  formId?: string;
  /**
   * Informa al shell (`AddFlow`) si los campos obligatorios están completos,
   * para habilitar/deshabilitar el botón de guardar.
   */
  onStateChange?: (state: { canSave: boolean; saving: boolean }) => void;
}

/** Descripciones rápidas para los gastos propios de la tarjeta */
const FEE_PRESETS = [
  "Mantenimiento",
  "IVA",
  "Intereses",
  "Seguro de vida",
  "Sellos",
  "Percepción",
  "Comisión",
  "Renovación",
];

export function NewExpenseHero({
  cards,
  categories,
  defaultCardId,
  feeMode = false,
  globalRate = null,
  recurringMode = false,
  formId,
  onStateChange,
}: NewExpenseHeroProps) {
  const router = useRouter();
  const { lastCardId, setLastCardId } = useLastCard();
  const [isPending, startTransition] = React.useTransition();
  const [discountActive, setDiscountActive] = React.useState(false);
  const [discountDistribution, setDiscountDistribution] =
    React.useState<DiscountDistribution>("prorated");

  // Categoría "Gastos de tarjeta" para preseleccionar en feeMode
  const feeCategoryId = React.useMemo(
    () => categories.find((c) => c.name === "Gastos de tarjeta")?.id ?? null,
    [categories]
  );
  const [duplicate, setDuplicate] = React.useState<{
    description: string;
    total_amount: number;
    payload: ExpenseFormData;
  } | null>(null);
  const [localCategories, setLocalCategories] = React.useState<Category[]>(categories);
  // Se pone en true justo antes de navegar tras un guardado exitoso, para que
  // el guard de "cambios sin guardar" no dispare en la redirección.
  const [savedOk, setSavedOk] = React.useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const initialCard =
    defaultCardId && cards.some((c) => c.id === defaultCardId)
      ? defaultCardId
      : lastCardId && cards.some((c) => c.id === lastCardId)
        ? lastCardId
        : cards[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      card_id: initialCard,
      currency: "ARS",
      installments: 1,
      recurring: recurringMode,
      tags: [],
      expense_date: today,
      description: "",
      category_id: feeMode ? feeCategoryId : undefined,
    },
  });

  const totalAmount = watch("total_amount");
  const installments = watch("installments");
  const recurring = watch("recurring");
  const discountPct = watch("discount_percentage") ?? 0;
  const discountCap = watch("discount_cap");
  const currency = watch("currency");
  const exchangeRate = watch("exchange_rate");
  const cardId = watch("card_id");
  const description = watch("description");
  const expenseDate = watch("expense_date");
  const isUsd = currency === "USD";

  useUnsavedChangesGuard(isDirty && !savedOk);

  // Estado para el shell (`AddFlow`): si el botón de guardar se habilita.
  // "Completo" = campos obligatorios del modo activo cargados; la validación
  // fina sigue corriendo en el submit (schema + duplicados).
  const canSave = Boolean(
    cardId &&
      (description ?? "").trim() &&
      totalAmount &&
      totalAmount !== 0 &&
      expenseDate &&
      (currency !== "USD" || (exchangeRate != null && exchangeRate > 0))
  );
  React.useEffect(() => {
    onStateChange?.({ canSave, saving: isPending });
  }, [canSave, isPending, onStateChange]);

  function changeCurrency(next: "ARS" | "USD") {
    setValue("currency", next);
    if (next === "ARS") setValue("exchange_rate", null);
    // Precargar el TC global al pasar a USD (editable)
    else if (!exchangeRate && globalRate != null) setValue("exchange_rate", globalRate);
  }

  function toggleAmountSign() {
    if (totalAmount) setValue("total_amount", -totalAmount);
  }

  function toggleRecurring(next: boolean) {
    setValue("recurring", next);
    // Un consumo fijo mensual es un cargo único por mes: sin cuotas.
    if (next) setValue("installments", 1);
  }

  const discountCalc =
    discountActive && totalAmount
      ? discountCap != null && discountCap >= 0
        ? Math.min(totalAmount * (discountPct / 100), discountCap)
        : totalAmount * (discountPct / 100)
      : 0;
  const finalPrice = totalAmount ? Math.max(0, totalAmount - discountCalc) : 0;

  // Auto-cálculo del monto por cuota
  React.useEffect(() => {
    const base = discountActive ? finalPrice : totalAmount;
    if (!base || !installments || installments < 1) return;

    if (discountActive && installments > 1) {
      // Con descuento y más de una cuota: la distribución elegida define
      // cómo se reparte (primera cuota vs. prorrateado).
      const breakdown = calculateInstallmentBreakdown(
        totalAmount,
        installments,
        discountCalc,
        discountDistribution
      );
      setValue("installment_amount", breakdown.installmentAmount);
      setValue("installment_amounts", breakdown.installmentAmounts);
    } else {
      const cuota = parseFloat((base / installments).toFixed(2));
      setValue("installment_amount", cuota);
      // Con descuento activo en una sola cuota no hay distinción posible:
      // se aplica directo, sin overrides por cuota.
      if (discountActive) setValue("installment_amounts", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installments, discountActive, discountPct, discountCap, discountDistribution]);

  function toggleDiscount(active: boolean) {
    setDiscountActive(active);
    if (!active) {
      setValue("discount_percentage", undefined);
      setValue("discount_cap", undefined);
      setValue("installment_amounts", null);
    }
  }

  function onSubmit(data: ExpenseFormData) {
    const payload: ExpenseFormData = {
      ...data,
      discount_percentage: discountActive ? data.discount_percentage : null,
      discount_cap: discountActive ? data.discount_cap : null,
    };
    save(payload, false);
  }

  function save(payload: ExpenseFormData, skipDuplicateCheck: boolean) {
    startTransition(async () => {
      const result = await createExpense(payload, { skipDuplicateCheck });

      if (result.success) {
        setLastCardId(payload.card_id);
        setSavedOk(true);
        toast.success("Consumo registrado");
        router.push(payload.card_id ? `/cards/${payload.card_id}` : "/expenses");
        router.refresh();
        return;
      }

      if (result.duplicate) {
        setDuplicate({
          description: result.duplicate.description,
          total_amount: result.duplicate.total_amount,
          payload,
        });
        return;
      }

      toast.error(result.error ?? "No se pudo guardar");
    });
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Necesitás al menos una tarjeta para registrar consumos.
        </p>
        <Button
          className="gradient-primary shadow-brand"
          onClick={() => router.push("/cards/new")}
        >
          Agregar tarjeta
        </Button>
      </div>
    );
  }

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3"
      >
        {/* Importe — sin título: el elemento principal del formulario */}
        <Controller
          control={control}
          name="total_amount"
          render={({ field }) => (
            <AmountHero
              value={field.value}
              onChange={(v) => field.onChange(v ?? 0)}
              currency={currency}
              onCurrencyChange={changeCurrency}
              invalid={!!errors.total_amount}
              errorMessage={errors.total_amount?.message}
            >
              {/* Marcar como devolución (negativo) */}
              <button
                type="button"
                onClick={toggleAmountSign}
                className={cn(
                  FIELD_BUTTON,
                  "mt-1",
                  (totalAmount ?? 0) < 0 &&
                    "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400"
                )}
              >
                {(totalAmount ?? 0) < 0 ? "− Devolución / reintegro" : "Marcar como devolución"}
              </button>

              {/* Tipo de cambio (sólo USD) */}
              {isUsd && (
                <div className="mx-auto mt-3 max-w-xs text-left">
                  <Controller
                    control={control}
                    name="exchange_rate"
                    render={({ field: rateField }) => (
                      <ExchangeRateField
                        id="ne-rate"
                        value={rateField.value ?? null}
                        onChange={(v) => rateField.onChange(v ?? undefined)}
                        equivalentBase={totalAmount || null}
                        required
                        invalid={!!errors.exchange_rate}
                        errorMessage={errors.exchange_rate?.message}
                      />
                    )}
                  />
                </div>
              )}
            </AmountHero>
          )}
        />

        {/* Chips rápidos de gastos de tarjeta */}
        {feeMode && (
          <div className="-mt-2 flex flex-wrap gap-2">
            {FEE_PRESETS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setValue("description", label)}
                className="inline-flex items-center rounded-full border border-white/[0.08] bg-card/70 px-3 py-1.5 text-[13px] font-semibold text-foreground/85 transition-colors hover:border-primary/40 hover:text-foreground active:scale-[0.97]"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Recuadro del formulario: una card por campo adentro, con el mismo
            bloque glass del listado de Períodos */}
        <div className="glass-card space-y-3 rounded-[20px] p-3">
          {/* Negocio — sin título, el placeholder alcanza */}
          <div>
            <div className={FIELD_INPUT}>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <DescriptionAutocomplete
                    id="ne-description"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Negocio"
                    invalid={!!errors.description}
                  />
                )}
              />
            </div>
            {errors.description && (
              <p className="mt-1.5 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Tarjeta + consumo fijo (recurrente) */}
          <Controller
            control={control}
            name="card_id"
            render={({ field }) => (
              <CardSelector
                cards={cards}
                value={field.value}
                onChange={field.onChange}
                error={!!errors.card_id}
                recurring={!!recurring}
                onRecurringChange={toggleRecurring}
              />
            )}
          />

          {/* Cuotas — ocultas para consumos fijos */}
          {!recurring && (
            <div className={cn(FIELD_CARD, "px-3 py-1.5")}>
              <span className={FIELD_LABEL}>Cuotas</span>
              <div className="mt-1">
                <Controller
                  control={control}
                  name="installments"
                  render={({ field }) => (
                    <InstallmentPresets
                      value={field.value ?? 1}
                      onChange={field.onChange}
                      invalid={!!errors.installments}
                      size="sm"
                    />
                  )}
                />
              </div>
              {/* Hint: monto por cuota (con descuento activo el detalle por
                  cuota se muestra en el bloque de distribución, más abajo) */}
              {!discountActive && !!totalAmount && totalAmount !== 0 && installments > 1 && (
                <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
                  {installments} cuotas de{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalAmount / installments, currency)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Fecha — sin título */}
          <div>
            <Controller
              control={control}
              name="expense_date"
              render={({ field }) => (
                <DatePickerField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  className={FIELD_ROW}
                />
              )}
            />
            {errors.expense_date && (
              <p className="mt-1.5 text-xs text-destructive">{errors.expense_date.message}</p>
            )}
          </div>

          {/* Promociones y descuentos */}
          <label className={cn(FIELD_CARD, "flex cursor-pointer items-center gap-2 px-3 py-1")}>
            <input
              type="checkbox"
              checked={discountActive}
              onChange={(e) => toggleDiscount(e.target.checked)}
              className="h-3 w-3 rounded border-border accent-primary"
            />
            <span className="text-[11px] font-semibold text-foreground">Promociones y Descuentos</span>
          </label>

          {discountActive && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="ne-disc-pct" required className={FIELD_LABEL}>
                  % descuento
                </Label>
                <div className={FIELD_INPUT}>
                  <Controller
                    control={control}
                    name="discount_percentage"
                    render={({ field }) => (
                      <AmountInput
                        id="ne-disc-pct"
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? undefined)}
                        prefix={null}
                        suffix="%"
                        placeholder="10"
                      />
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ne-disc-cap" className={FIELD_LABEL}>
                  Tope (opcional)
                </Label>
                <div className={FIELD_INPUT}>
                  <Controller
                    control={control}
                    name="discount_cap"
                    render={({ field }) => (
                      <AmountInput
                        id="ne-disc-cap"
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? undefined)}
                        placeholder="Sin tope"
                      />
                    )}
                  />
                </div>
              </div>
              {totalAmount > 0 && (
                <div
                  className={cn(
                    FIELD_CARD,
                    "col-span-2 flex justify-between px-3 py-1 text-[11px] font-semibold"
                  )}
                >
                  <span className="text-muted-foreground">Precio final</span>
                  <span className="text-foreground">{formatCurrency(finalPrice, currency)}</span>
                </div>
              )}

              {/* Distribución del descuento entre cuotas — solo con más
                  de una cuota; con una sola, se aplica directo. */}
              {installments > 1 && (
                <div className="col-span-2 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountDistribution("first")}
                      className={fieldOption(discountDistribution === "first")}
                    >
                      Aplicar en la primera
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountDistribution("prorated")}
                      className={fieldOption(discountDistribution === "prorated")}
                    >
                      Distribuir en todas
                    </button>
                  </div>

                  {totalAmount > 0 && (() => {
                    const breakdown = calculateInstallmentBreakdown(
                      totalAmount,
                      installments,
                      discountCalc,
                      discountDistribution
                    );
                    return (
                      <p className="text-[11px] text-muted-foreground">
                        {discountDistribution === "first" ? (
                          <>
                            Cuota 1:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(breakdown.amounts[0], currency)}
                            </span>{" "}
                            · Cuotas 2 a {installments}:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(breakdown.amounts[1], currency)}
                            </span>{" "}
                            c/u
                          </>
                        ) : breakdown.installmentAmounts ? (
                          <>
                            Cuotas 1 a {installments - 1}:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(breakdown.amounts[0], currency)}
                            </span>{" "}
                            · Cuota {installments}:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(breakdown.amounts[installments - 1], currency)}
                            </span>
                          </>
                        ) : (
                          <>
                            {installments} cuotas de{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(breakdown.amounts[0], currency)}
                            </span>{" "}
                            c/u
                          </>
                        )}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Información adicional — sin título, el placeholder alcanza */}
          <Input
            id="ne-notes"
            aria-label="Información adicional"
            placeholder="Información adicional"
            className={FIELD_ROW}
            {...register("notes")}
          />
        </div>

        {/* Categoría */}
        <div className="space-y-3 pt-2">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            Categoría
          </span>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <CategoryGrid
                categories={localCategories}
                value={field.value ?? null}
                onChange={field.onChange}
                onCategoryCreated={(cat) => {
                  setLocalCategories((prev) => [...prev, cat]);
                  field.onChange(cat.id);
                }}
              />
            )}
          />
        </div>
      </form>

      {/* Diálogo: posible duplicado */}
      <AlertDialog
        open={!!duplicate}
        onOpenChange={(o) => {
          if (!o) setDuplicate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Es un consumo distinto?</AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos un consumo casi idéntico ya registrado:{" "}
              <strong>{duplicate?.description}</strong> por{" "}
              <strong>{formatCurrency(duplicate?.total_amount ?? 0)}</strong> en la misma
              tarjeta y fecha. ¿Querés guardarlo igual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (duplicate) {
                  const p = duplicate.payload;
                  setDuplicate(null);
                  save(p, true);
                }
              }}
            >
              Sí, guardar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─── Subcomponentes ──────────────────────────────────────── */

function CardSelector({
  cards,
  value,
  onChange,
  error,
  recurring,
  onRecurringChange,
}: {
  cards: Card[];
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  recurring: boolean;
  onRecurringChange: (next: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = cards.find((c) => c.id === value);

  return (
    <>
      <div className={cn(FIELD_CARD, "px-3 py-1", error && "border-destructive")}>
        {/* Selector de tarjeta: nombre + flechita */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Elegir tarjeta"
          className={cn(
            "flex w-full items-center gap-2 text-left text-[11px] font-semibold transition-colors",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {selected && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span className="min-w-0 flex-1 truncate">
            {selected ? cardLabel(selected) : "Seleccioná"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>

        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/60 pt-1">
          <button
            type="button"
            onClick={() => onRecurringChange(!recurring)}
            tabIndex={-1}
            aria-hidden
            className="flex items-center gap-2 text-[11px] font-semibold text-foreground"
          >
            <Repeat className="h-3 w-3 text-primary" />
            Consumo fijo
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={recurring}
            aria-label="Consumo fijo"
            onClick={() => onRecurringChange(!recurring)}
            className={cn(
              "relative h-[1.125rem] w-8 shrink-0 rounded-full transition-colors",
              recurring ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                recurring ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        {recurring && (
          <p className={cn(FIELD_LABEL, "mt-1")}>Se repetirá en los siguientes meses</p>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="pb-safe px-0">
          <SheetHeader className="px-5 pb-2">
            <SheetTitle>Elegí la tarjeta</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/50">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors active:bg-muted/60"
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">
                  {cardLabel(c)}
                </span>
                {value === c.id && (
                  <span className="text-[13px] font-bold text-primary">✓</span>
                )}
              </button>
            ))}
            <GuardedLink
              href={`/cards/new?return=${encodeURIComponent("/expenses/new")}`}
              className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left text-primary transition-colors active:bg-muted/60"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <Plus className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[15px] font-semibold">
                Agregar tarjeta nueva
              </span>
            </GuardedLink>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

const EMOJI_OPTIONS = ["🛒","🍔","🚗","💊","🎬","👕","⚡","✈️","💻","📦","🏠","🐾","🎮","📚","🍷","💈","🏋️","🎁"];

const COLOR_PAIRS = [
  { bg: "#dcfce7", text: "#15803d", label: "Verde"    },
  { bg: "#fef9c3", text: "#a16207", label: "Amarillo" },
  { bg: "#dbeafe", text: "#1d4ed8", label: "Azul"     },
  { bg: "#fce7f3", text: "#9d174d", label: "Rosa"     },
  { bg: "#ede9fe", text: "#6d28d9", label: "Violeta"  },
  { bg: "#fef3c7", text: "#d97706", label: "Naranja"  },
  { bg: "#e0f2fe", text: "#0369a1", label: "Celeste"  },
  { bg: "#f5f5f4", text: "#57534e", label: "Gris"     },
] as const;

interface CategoryGridProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCategoryCreated?: (cat: Category) => void;
}

function CategoryGrid({ categories, value, onChange, onCategoryCreated }: CategoryGridProps) {
  const presets = categories.filter((c) => c.is_preset);
  const customs = categories.filter((c) => !c.is_preset);
  const ordered = [...presets, ...customs];

  const [newOpen, setNewOpen] = React.useState(false);
  const [newEmoji, setNewEmoji] = React.useState("✨");
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState<(typeof COLOR_PAIRS)[number]>(COLOR_PAIRS[0]);
  const [newError, setNewError] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function handleCreate() {
    if (!newName.trim()) { setNewError("El nombre es requerido"); return; }
    setNewError("");
    startTransition(async () => {
      const result = await createCategory({
        name: newName.trim(),
        emoji: newEmoji || "✨",
        color_bg: newColor.bg,
        color_text: newColor.text,
      });
      if (result.success && result.category) {
        onCategoryCreated?.(result.category as Category);
        setNewOpen(false);
        setNewName("");
        setNewEmoji("✨");
        setNewColor(COLOR_PAIRS[0]);
      } else {
        setNewError(("error" in result ? result.error : undefined) ?? "No se pudo crear");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ordered.map((cat) => {
          const isSelected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(isSelected ? null : cat.id)}
              className={cn(
                "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all active:scale-[0.97]",
                isSelected
                  ? "border-transparent text-white shadow-md"
                  : "border-white/[0.08] bg-card/70 text-foreground/85 hover:border-primary/40 hover:text-foreground"
              )}
              style={
                isSelected
                  ? {
                      background: `linear-gradient(135deg, ${cat.color_text} 0%, ${cat.color_text}cc 100%)`,
                      boxShadow: `0 6px 18px -6px ${cat.color_text}80`,
                    }
                  : {
                      backdropFilter: "blur(10px) saturate(140%)",
                      WebkitBackdropFilter: "blur(10px) saturate(140%)",
                    }
              }
              title={cat.name}
            >
              <span
                className={cn(
                  "text-base leading-none transition-transform",
                  isSelected ? "scale-105" : ""
                )}
                aria-hidden
              >
                {cat.emoji}
              </span>
              <span className="whitespace-nowrap">{cat.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/[0.04] px-3 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nueva</span>
        </button>
      </div>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="pb-3">
            <SheetTitle>Nueva categoría</SheetTitle>
          </SheetHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <Input
              placeholder="Nombre de la categoría"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewError(""); }}
              maxLength={30}
              autoFocus
              className={cn(newError && "border-destructive")}
            />
            {newError && <p className="text-xs text-destructive">{newError}</p>}

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Emoji</p>
              <div className="flex items-center gap-2">
                <Input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="h-9 w-14 text-center text-lg"
                  maxLength={4}
                  placeholder="🎯"
                  aria-label="Emoji personalizado"
                />
                <span className="text-xs text-muted-foreground">
                  Editá libremente o elegí uno
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewEmoji(e)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-lg transition-all",
                      newEmoji === e ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PAIRS.map((pair) => (
                  <button
                    key={pair.bg}
                    type="button"
                    onClick={() => setNewColor(pair)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs font-medium transition-all",
                      newColor.bg === pair.bg && "ring-2 ring-primary scale-105"
                    )}
                    style={{ backgroundColor: pair.bg, color: pair.text }}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="btn-glass-primary"
                onClick={handleCreate}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewOpen(false)}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
