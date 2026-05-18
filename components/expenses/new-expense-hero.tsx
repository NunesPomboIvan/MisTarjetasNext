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
import { createCategory } from "@/actions/categories";
import { useLastCard } from "@/lib/hooks/use-last-card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { InstallmentPresets } from "./installment-presets";
import { cn, formatAmountInput, unformatAmount, formatCurrency } from "@/lib/utils";
import type { Card, Category } from "@/lib/supabase/database.types";


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
  const [localCategories, setLocalCategories] = React.useState<Category[]>(categories);

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
                <CardSelector
                  cards={cards}
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.card_id}
                />
              )}
            />
          </div>

          {/* Cuotas */}
          <div className="px-4 py-3">
            <span className="text-sm font-medium text-foreground">Cuotas</span>
            <div className="mt-2">
              <Controller
                control={control}
                name="installments"
                render={({ field }) => (
                  <InstallmentPresets
                    value={field.value ?? 1}
                    onChange={field.onChange}
                    invalid={!!errors.installments}
                  />
                )}
              />
            </div>
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

function CardSelector({
  cards,
  value,
  onChange,
  error,
}: {
  cards: Card[];
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = cards.find((c) => c.id === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium transition-colors",
          error ? "text-destructive" : "text-foreground"
        )}
      >
        {selected && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selected.color }}
          />
        )}
        <span className="max-w-[160px] truncate">
          {selected ? `${selected.name} ··${selected.last_four}` : "Seleccioná"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

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
                <span className="flex-1 text-[15px] font-medium text-foreground">
                  {c.name}
                </span>
                <span className="text-xs text-muted-foreground">····{c.last_four}</span>
                {value === c.id && (
                  <span className="text-[13px] font-bold text-primary">✓</span>
                )}
              </button>
            ))}
            <Link
              href={`/cards/new?return=${encodeURIComponent("/expenses/new")}`}
              className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left text-primary transition-colors active:bg-muted/60"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <Plus className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[15px] font-semibold">
                Agregar tarjeta nueva
              </span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

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
    const raw = e.target.value;
    // When the display contains thousands-separator dots (e.g. "1.256"), the browser
    // includes them in e.target.value (e.g. "1.2565" after typing "5"). A single dot
    // would be misread as a decimal separator. Strip our formatting dots first.
    const commaIdx = raw.indexOf(",");
    let cleaned: string;
    if (commaIdx >= 0) {
      // Decimal comma present → all dots before it are thousands seps
      cleaned = raw.slice(0, commaIdx).replace(/\./g, "") + raw.slice(commaIdx);
    } else {
      const dotCount = (raw.match(/\./g) ?? []).length;
      if (dotCount > 1) {
        // Multiple dots → all thousands seps
        cleaned = raw.replace(/\./g, "");
      } else if (dotCount === 1 && display.includes(".")) {
        // Single dot and we already had a thousands dot → strip it
        cleaned = raw.replace(/\./g, "");
      } else {
        // No dot, or user just typed a decimal dot → pass through (formatAmountInput handles it)
        cleaned = raw;
      }
    }
    const next = formatAmountInput(cleaned);
    setDisplay(next);
    const parsed = unformatAmount(next);
    onChange(next === "" ? undefined : parsed);
  }

  const len = display.length || 1;
  const fontSize =
    len <= 5  ? 48 :
    len <= 9  ? 38 :
    len <= 12 ? 30 :
    len <= 15 ? 24 : 20;

  return (
    <div className="relative mt-2 flex min-h-[4rem] items-center justify-center px-8">
      <span
        className={cn(
          "absolute left-6 top-1/2 -translate-y-1/2 select-none font-bold",
          invalid ? "text-destructive" : "text-muted-foreground"
        )}
        style={{ fontSize: 18 }}
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
          "w-full bg-transparent text-center font-bold tracking-tight tabular-nums outline-none placeholder:text-foreground/25",
          invalid ? "text-destructive" : "text-foreground"
        )}
        style={{ fontSize } as React.CSSProperties}
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
        placeholder="Ingresá el comercio…"
        invalid={invalid}
      />
    </div>
  );
}

const COLOR_PAIRS = [
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#f3e8ff", text: "#6b21a8" },
  { bg: "#ffedd5", text: "#9a3412" },
  { bg: "#e0f2fe", text: "#075985" },
  { bg: "#f1f5f9", text: "#334155" },
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
                  "line-clamp-2 w-full break-words text-[11.5px] font-semibold leading-tight",
                  !isSelected && "text-foreground"
                )}
                style={isSelected ? { color: cat.color_text } : undefined}
                title={cat.name}
              >
                {cat.name}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/40 bg-card/50 px-2 py-3 text-center text-primary transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Plus className="h-5 w-5" />
          <span className="text-[11.5px] font-medium">Nueva</span>
        </button>
      </div>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="pb-3">
            <SheetTitle>Nueva categoría</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-1 pb-2">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: newColor.bg }}
              >
                {newEmoji || "✨"}
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="nc-emoji">Emoji</Label>
                <Input
                  id="nc-emoji"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value || "✨")}
                  className="text-center text-xl"
                  maxLength={4}
                  placeholder="✨"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-name">Nombre</Label>
              <Input
                id="nc-name"
                placeholder="Ej: Mascota"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewError(""); }}
                maxLength={30}
                className={cn(newError && "border-destructive")}
              />
              {newError && <p className="text-xs text-destructive">{newError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2.5">
                {COLOR_PAIRS.map((pair, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNewColor(pair)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      newColor === pair ? "scale-110 border-foreground shadow-sm" : "border-transparent"
                    )}
                    style={{ backgroundColor: pair.bg }}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="gradient-primary shadow-brand w-full"
              onClick={handleCreate}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar categoría"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
