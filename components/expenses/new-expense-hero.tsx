"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, Loader2, Plus } from "lucide-react";

import { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense";
import { createExpense } from "@/actions/expenses";
import { useLastCard } from "@/lib/hooks/use-last-card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { cn, formatAmountInput, unformatAmount, formatCurrency } from "@/lib/utils";
import type { Card, Category } from "@/lib/supabase/database.types";

const CUOTA_PRESETS = [1, 3, 6, 12] as const;

interface NewExpenseHeroProps {
  cards: Card[];
  categories: Category[];
  defaultCardId?: string;
  backHref: string;
}

export function NewExpenseHero({
  cards,
  categories,
  defaultCardId,
  backHref,
}: NewExpenseHeroProps) {
  const router = useRouter();
  const { lastCardId, setLastCardId } = useLastCard();
  const [isPending, startTransition] = React.useTransition();
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [discountActive, setDiscountActive] = React.useState(false);
  const [duplicate, setDuplicate] = React.useState<{
    description: string;
    total_amount: number;
    payload: ExpenseFormData;
  } | null>(null);
  const [otherCuotaActive, setOtherCuotaActive] = React.useState(false);

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
    formState: { errors },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      card_id: initialCard,
      currency: "ARS",
      installments: 1,
      tags: [],
      expense_date: today,
      description: "",
    },
  });

  const totalAmount = watch("total_amount");
  const installments = watch("installments");
  const discountPct = watch("discount_percentage") ?? 0;
  const discountCap = watch("discount_cap");

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
    if (base && installments && installments >= 1) {
      const cuota = parseFloat((base / installments).toFixed(2));
      setValue("installment_amount", cuota);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installments, discountActive, discountPct, discountCap]);

  function toggleDiscount(active: boolean) {
    setDiscountActive(active);
    if (!active) {
      setValue("discount_percentage", undefined);
      setValue("discount_cap", undefined);
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header sticky: Cancelar / Título / Guardar */}
        <div className="-mx-4 -mt-4 sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/70">
          <Link
            href={backHref}
            className="justify-self-start text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            Cancelar
          </Link>
          <h1 className="text-[15px] font-semibold tracking-tight">Nuevo consumo</h1>
          <Button
            type="submit"
            disabled={isPending}
            className="gradient-primary shadow-brand h-9 justify-self-end rounded-full px-5 text-sm font-semibold"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Guardar"
            )}
          </Button>
        </div>

        {/* Hero: monto */}
        <div className="halo-warm relative -mx-4 px-4 pt-4 pb-8 text-center">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            Monto
          </span>
          <Controller
            control={control}
            name="total_amount"
            render={({ field }) => (
              <HeroAmountInput
                value={field.value}
                onChange={(v) => field.onChange(v ?? 0)}
                invalid={!!errors.total_amount}
              />
            )}
          />
          {errors.total_amount && (
            <p className="mt-1 text-xs text-destructive">{errors.total_amount.message}</p>
          )}
        </div>

        {/* Card: comercio / tarjeta / cuotas */}
        <div className="rounded-2xl border border-border bg-card divide-y divide-border/70 shadow-sm">
          {/* Comercio */}
          <div className="px-4 py-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Comercio
            </span>
            <div className="mt-1">
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <BorderlessDescription
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    invalid={!!errors.description}
                  />
                )}
              />
            </div>
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Tarjeta */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Tarjeta</span>
            <Controller
              control={control}
              name="card_id"
              render={({ field }) => (
                <div className="relative flex items-center">
                  <select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={cn(
                      "appearance-none bg-transparent pr-5 text-right text-sm font-medium text-foreground outline-none focus:text-primary",
                      errors.card_id && "text-destructive"
                    )}
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ··{c.last_four}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              )}
            />
          </div>

          {/* Cuotas */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Cuotas</span>
            <Controller
              control={control}
              name="installments"
              render={({ field }) => {
                const isPreset = CUOTA_PRESETS.includes(
                  field.value as (typeof CUOTA_PRESETS)[number]
                );
                const otherActive = otherCuotaActive && !isPreset;
                return (
                  <div className="flex items-center gap-1.5">
                    {CUOTA_PRESETS.map((n) => {
                      const active = !otherActive && field.value === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setOtherCuotaActive(false);
                            field.onChange(n);
                          }}
                          className={cn(
                            "flex h-9 min-w-[2.4rem] items-center justify-center rounded-full px-3 text-[13px] font-semibold tabular-nums transition-all",
                            active
                              ? "gradient-primary text-white shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          )}
                        >
                          {n}x
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setOtherCuotaActive(true);
                        if (
                          CUOTA_PRESETS.includes(
                            field.value as (typeof CUOTA_PRESETS)[number]
                          )
                        ) {
                          field.onChange(2);
                        }
                      }}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-all",
                        otherActive
                          ? "gradient-primary text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                      aria-label="Otra cantidad de cuotas"
                    >
                      …
                    </button>
                    {otherActive && (
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        inputMode="numeric"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (Number.isFinite(n))
                            field.onChange(Math.max(1, Math.min(120, n)));
                        }}
                        className="h-9 w-16 text-center"
                        autoFocus
                      />
                    )}
                  </div>
                );
              }}
            />
          </div>
        </div>

        {/* Hint: monto por cuota */}
        {totalAmount > 0 && installments > 1 && (
          <p className="-mt-2 text-right text-xs text-muted-foreground">
            {installments} cuotas de{" "}
            <span className="font-medium text-foreground">
              {formatCurrency((discountActive ? finalPrice : totalAmount) / installments)}
            </span>
          </p>
        )}

        {/* Categoría */}
        <div className="space-y-3">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
            Categoría
          </span>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <CategoryGrid
                categories={categories}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Más opciones */}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span>Más opciones (fecha, descuento, notas)</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
          />
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="ne-date">Fecha del consumo</Label>
              <Input
                id="ne-date"
                type="date"
                {...register("expense_date")}
                className={cn(errors.expense_date && "border-destructive")}
              />
            </div>

            <Separator />

            {/* Descuento */}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={discountActive}
                  onChange={(e) => toggleDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm font-medium">Aplicar descuento / reintegro</span>
              </label>

              {discountActive && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="ne-disc-pct" className="text-xs">
                      % descuento
                    </Label>
                    <Input
                      id="ne-disc-pct"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      placeholder="10"
                      {...register("discount_percentage", {
                        valueAsNumber: true,
                        setValueAs: (v) =>
                          v === "" || isNaN(v) ? undefined : Number(v),
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ne-disc-cap" className="text-xs">
                      Tope (opcional)
                    </Label>
                    <Input
                      id="ne-disc-cap"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="Sin tope"
                      {...register("discount_cap", {
                        valueAsNumber: true,
                        setValueAs: (v) =>
                          v === "" || isNaN(v) ? undefined : Number(v),
                      })}
                    />
                  </div>
                  {totalAmount > 0 && (
                    <div className="col-span-2 flex justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                      <span className="text-muted-foreground">Precio final</span>
                      <span className="font-semibold">{formatCurrency(finalPrice)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="ne-notes" className="text-xs">
                Notas
              </Label>
              <Input
                id="ne-notes"
                placeholder="Detalle adicional…"
                {...register("notes")}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="ne-tags" className="text-xs">
                Tags{" "}
                <span className="font-normal text-muted-foreground">
                  (separados por coma)
                </span>
              </Label>
              <Input
                id="ne-tags"
                placeholder="viaje, trabajo"
                onChange={(e) => {
                  const tags = e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  setValue("tags", tags);
                }}
              />
            </div>
          </div>
        )}
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

interface HeroAmountInputProps {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  invalid?: boolean;
}

function HeroAmountInput({ value, onChange, invalid }: HeroAmountInputProps) {
  const [display, setDisplay] = React.useState<string>(() =>
    value == null || value === 0
      ? ""
      : formatAmountInput(String(value).replace(".", ","))
  );

  // Sync con cambios externos (ej: reset)
  const [prev, setPrev] = React.useState<number | null | undefined>(value);
  if (value !== prev) {
    setPrev(value);
    const parsed = unformatAmount(display);
    if (value != null && Math.abs(parsed - value) > 0.001) {
      setDisplay(
        value === 0 ? "" : formatAmountInput(value.toFixed(2).replace(".", ","))
      );
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = formatAmountInput(e.target.value);
    setDisplay(next);
    const parsed = unformatAmount(next);
    onChange(next === "" ? undefined : parsed);
  }

  return (
    <div className="mt-2 flex items-baseline justify-center gap-2">
      <span
        className={cn(
          "text-[28px] font-medium select-none",
          invalid ? "text-destructive" : "text-muted-foreground"
        )}
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        placeholder="0"
        value={display}
        onChange={handleChange}
        aria-invalid={invalid}
        className={cn(
          "min-w-[2ch] max-w-[260px] bg-transparent text-center text-[44px] font-bold tracking-tight tabular-nums outline-none placeholder:text-foreground/25",
          invalid ? "text-destructive" : "text-foreground"
        )}
        style={{ fieldSizing: "content" } as React.CSSProperties}
      />
    </div>
  );
}

interface BorderlessDescriptionProps {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}

/**
 * Variante "ghost" (sin borde) del autocomplete de descripción, para integrarse
 * dentro de la card del hero como una row más.
 */
function BorderlessDescription({ value, onChange, invalid }: BorderlessDescriptionProps) {
  return (
    <div className="[&_input]:h-auto [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:py-0 [&_input]:text-base [&_input]:font-medium [&_input]:focus-visible:border-0 [&_input]:focus-visible:ring-0">
      <DescriptionAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Ej: Coto Caballito"
        invalid={invalid}
      />
    </div>
  );
}

interface CategoryGridProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}

function CategoryGrid({ categories, value, onChange }: CategoryGridProps) {
  const presets = categories.filter((c) => c.is_preset);
  const customs = categories.filter((c) => !c.is_preset);
  const ordered = [...presets, ...customs];

  return (
    <div className="grid grid-cols-4 gap-2">
      {ordered.map((cat) => {
        const isSelected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(isSelected ? null : cat.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border bg-card px-2 py-3 text-center transition-all",
              isSelected
                ? "shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-card/80"
            )}
            style={
              isSelected
                ? {
                    borderColor: cat.color_text,
                    borderWidth: "1.5px",
                    backgroundColor: cat.color_bg + "55",
                  }
                : undefined
            }
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: cat.color_bg }}
            >
              {cat.emoji}
            </span>
            <span
              className={cn(
                "text-[11.5px] font-semibold leading-tight",
                !isSelected && "text-foreground"
              )}
              style={isSelected ? { color: cat.color_text } : undefined}
            >
              {cat.name}
            </span>
          </button>
        );
      })}
      {/* Tile para limpiar selección si hay alguna activa */}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card/50 px-2 py-3 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-5 w-5 rotate-45" />
          <span className="text-[11.5px] font-medium">Quitar</span>
        </button>
      )}
    </div>
  );
}
