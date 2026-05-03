"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, Loader2, Save, X } from "lucide-react";

import { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense";
import { createExpense } from "@/actions/expenses";
import { useLastCard } from "@/lib/hooks/use-last-card";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CardLogo } from "@/components/cards/card-logo";
import { CategoryPicker } from "./category-picker";
import { AmountInput } from "./amount-input";
import { InstallmentPresets } from "./installment-presets";
import { DescriptionAutocomplete } from "./description-autocomplete";
import { cn, formatCurrency } from "@/lib/utils";
import type { Card, Category } from "@/lib/supabase/database.types";

interface QuickExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Card[];
  categories: Category[];
  /** Tarjeta pre-seleccionada (ej: viene del FAB en card detail). Si no se pasa, usa la última usada */
  defaultCardId?: string;
}

/**
 * Bottom sheet de ingreso rápido de consumos.
 * - Campos esenciales arriba (descripción, monto, tarjeta, cuotas)
 * - Sección "Más opciones" colapsada por defecto (fecha, categoría, descuento, notas, tags)
 * - Persiste última tarjeta en localStorage
 * - Detecta duplicados antes de guardar
 */
export function QuickExpenseSheet({
  open,
  onOpenChange,
  cards,
  categories,
  defaultCardId,
}: QuickExpenseSheetProps) {
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

  const today = format(new Date(), "yyyy-MM-dd");

  // Resolver default card: explicit > last used (si existe en lista) > primera
  const resolvedDefaultCard = React.useMemo(() => {
    if (defaultCardId && cards.some((c) => c.id === defaultCardId)) return defaultCardId;
    if (lastCardId && cards.some((c) => c.id === lastCardId)) return lastCardId;
    return cards[0]?.id ?? "";
  }, [defaultCardId, lastCardId, cards]);

  const {
    handleSubmit,
    control,
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      card_id: resolvedDefaultCard,
      currency: "ARS",
      installments: 1,
      tags: [],
      expense_date: today,
      description: "",
    },
  });

  // Re-inicializar al abrir
  React.useEffect(() => {
    if (open) {
      reset({
        card_id: resolvedDefaultCard,
        currency: "ARS",
        installments: 1,
        tags: [],
        expense_date: today,
        description: "",
      });
      setShowAdvanced(false);
      setDiscountActive(false);
      setDuplicate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedDefaultCard]);

  const totalAmount = watch("total_amount");
  const installments = watch("installments");
  const discountPct = watch("discount_percentage") ?? 0;
  const discountCap = watch("discount_cap");
  const cardId = watch("card_id");

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
        onOpenChange(false);
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>Sin tarjetas</SheetTitle>
            <SheetDescription>
              Agregá una tarjeta antes de registrar consumos.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <Button
              className="gradient-primary shadow-brand w-full"
              onClick={() => {
                onOpenChange(false);
                router.push("/cards/new");
              }}
            >
              Agregar tarjeta
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const selectedCard = cards.find((c) => c.id === cardId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-dvh overflow-y-auto rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]"
        >
          {/* Drag handle visual */}
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />

          <SheetHeader className="px-4 pt-2 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Nuevo consumo</SheetTitle>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
            {/* Tarjeta — chips horizontal */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Tarjeta
              </Label>
              <Controller
                control={control}
                name="card_id"
                render={({ field }) => (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {cards.map((c) => {
                      const active = field.value === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => field.onChange(c.id)}
                          className={cn(
                            "flex flex-shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                            active
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: c.color + "25" }}
                          >
                            <CardLogo type={c.type} size="sm" />
                          </div>
                          <span className={cn("font-medium", active && "text-foreground")}>
                            {c.name}
                          </span>
                          <span className="text-xs text-muted-foreground">•••• {c.last_four}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.card_id && (
                <p className="text-xs text-destructive">{errors.card_id.message}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="qe-description">Descripción</Label>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <DescriptionAutocomplete
                    id="qe-description"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Ej: Supermercado Coto"
                    invalid={!!errors.description}
                    autoFocus
                  />
                )}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Monto + Cuotas */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qe-amount">Monto total</Label>
                <Controller
                  control={control}
                  name="total_amount"
                  render={({ field }) => (
                    <AmountInput
                      id="qe-amount"
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? 0)}
                      invalid={!!errors.total_amount}
                      size="lg"
                    />
                  )}
                />
                {errors.total_amount && (
                  <p className="text-xs text-destructive">{errors.total_amount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Cuotas</Label>
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
                {totalAmount > 0 && installments > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {installments} cuotas de{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency((discountActive ? finalPrice : totalAmount) / installments)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Más opciones */}
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span>Más opciones (fecha, categoría, descuento, notas)</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-3">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <Label htmlFor="qe-date">Fecha</Label>
                  <Input
                    id="qe-date"
                    type="date"
                    {...register("expense_date")}
                    className={cn(errors.expense_date && "border-destructive")}
                  />
                </div>

                <Separator />

                {/* Categoría */}
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Controller
                    control={control}
                    name="category_id"
                    render={({ field }) => (
                      <CategoryPicker
                        categories={categories}
                        value={field.value ?? null}
                        onChange={field.onChange}
                      />
                    )}
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
                        <Label htmlFor="qe-disc-pct" className="text-xs">
                          % descuento
                        </Label>
                        <Input
                          id="qe-disc-pct"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          inputMode="decimal"
                          {...register("discount_percentage", {
                            valueAsNumber: true,
                            setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)),
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="qe-disc-cap" className="text-xs">
                          Tope (opcional)
                        </Label>
                        <Input
                          id="qe-disc-cap"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="Sin tope"
                          {...register("discount_cap", {
                            valueAsNumber: true,
                            setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)),
                          })}
                        />
                      </div>
                      {totalAmount > 0 && (
                        <div className="col-span-2 flex justify-between rounded-lg bg-card border border-border px-2.5 py-1.5 text-xs">
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
                  <Label htmlFor="qe-notes" className="text-xs">
                    Notas
                  </Label>
                  <Input
                    id="qe-notes"
                    placeholder="Detalle adicional…"
                    {...register("notes")}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label htmlFor="qe-tags" className="text-xs">
                    Tags{" "}
                    <span className="font-normal text-muted-foreground">(separados por coma)</span>
                  </Label>
                  <Input
                    id="qe-tags"
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

            {/* Submit sticky */}
            <div className="sticky bottom-0 -mx-4 border-t border-border bg-popover/95 p-4 pb-0 backdrop-blur supports-backdrop-filter:bg-popover/70">
              <Button
                type="submit"
                className="gradient-primary shadow-brand w-full font-semibold"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Registrar{" "}
                    {totalAmount > 0
                      ? `· ${formatCurrency(discountActive ? finalPrice : totalAmount)}`
                      : ""}
                    {selectedCard ? ` en ${selectedCard.name}` : ""}
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Diálogo de duplicado */}
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
              <strong>{formatCurrency(duplicate?.total_amount ?? 0)}</strong> en la misma tarjeta y
              fecha. ¿Querés guardarlo igual?
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
