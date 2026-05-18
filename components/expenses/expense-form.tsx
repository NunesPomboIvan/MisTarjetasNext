"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2, Save } from "lucide-react";
import { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense";
import {
  createExpense,
  updateExpense,
  updateInstallmentAmount,
  updateAllInstallmentAmounts,
} from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { CategoryPicker } from "./category-picker";
import { AmountInput } from "./amount-input";
import { InstallmentPresets } from "./installment-presets";
import { DescriptionAutocomplete } from "./description-autocomplete";
import { useLastCard } from "@/lib/hooks/use-last-card";
import { cn, formatCurrency } from "@/lib/utils";
import type { Card, Category, Expense } from "@/lib/supabase/database.types";
import { format } from "date-fns";

interface ExpenseFormProps {
  cards: Card[];
  categories: Category[];
  expense?: Expense;
  defaultCardId?: string;
  /** Índice 0-based de la cuota que se estaba viendo. Undefined = edición desde lista global */
  installmentIndex?: number;
}

export function ExpenseForm({
  cards,
  categories,
  expense,
  defaultCardId,
  installmentIndex,
}: ExpenseFormProps) {
  const router = useRouter();
  const { lastCardId, setLastCardId } = useLastCard();
  const [isPending, startTransition] = useTransition();
  const [discountActive, setDiscountActive] = useState<boolean>(
    !!expense?.discount_percentage
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!!expense);
  const [installmentChoiceData, setInstallmentChoiceData] =
    useState<ExpenseFormData | null>(null);
  const [duplicate, setDuplicate] = useState<{
    description: string;
    total_amount: number;
    payload: ExpenseFormData;
  } | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // En modo creación, sugerir la última tarjeta usada si no hay defaultCardId
  const initialCard =
    defaultCardId ??
    (lastCardId && cards.some((c) => c.id === lastCardId) ? lastCardId : cards[0]?.id ?? "");

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
    defaultValues: expense
      ? {
          card_id: expense.card_id,
          category_id: expense.category_id ?? null,
          description: expense.description,
          total_amount: expense.total_amount,
          installments: expense.installments,
          installment_amount: expense.installment_amount,
          discount_percentage: expense.discount_percentage ?? undefined,
          discount_cap: expense.discount_cap ?? undefined,
          expense_date: expense.expense_date,
          currency: expense.currency,
          notes: expense.notes ?? "",
          tags: expense.tags ?? [],
        }
      : {
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

  // Descuento calculado: min(monto * %, tope)
  const discountCalculado =
    discountActive && totalAmount
      ? discountCap != null && discountCap >= 0
        ? Math.min(totalAmount * (discountPct / 100), discountCap)
        : totalAmount * (discountPct / 100)
      : 0;
  const precioFinal = totalAmount ? Math.max(0, totalAmount - discountCalculado) : 0;

  // Auto-calcular cuota
  useEffect(() => {
    const base = discountActive ? precioFinal : totalAmount;
    if (base && installments && installments >= 1) {
      const cuota = parseFloat((base / installments).toFixed(2));
      setValue("installment_amount", cuota);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installments, discountActive, discountPct, discountCap, setValue]);

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

    const amountChanged =
      expense && payload.installment_amount !== expense.installment_amount;
    const isMultiInstallment = expense && expense.installments > 1;
    const hasInstallmentContext = installmentIndex !== undefined;

    if (isMultiInstallment && amountChanged && hasInstallmentContext) {
      setInstallmentChoiceData(payload);
      return;
    }

    saveExpense(payload, false);
  }

  function saveExpense(payload: ExpenseFormData, skipDuplicateCheck: boolean) {
    startTransition(async () => {
      const result = expense
        ? await updateExpense(expense.id, payload, { skipDuplicateCheck })
        : await createExpense(payload, { skipDuplicateCheck });

      if (result.success) {
        if (!expense) setLastCardId(payload.card_id);
        toast.success(expense ? "Consumo actualizado" : "Consumo registrado");
        router.push(payload.card_id ? `/cards/${payload.card_id}` : "/expenses");
        router.refresh();
        return;
      }

      // Tanto createExpense como updateExpense pueden devolver 'duplicate'
      const dup = (result as { duplicate?: { description: string; total_amount: number } })
        .duplicate;
      if (dup) {
        setDuplicate({
          description: dup.description,
          total_amount: dup.total_amount,
          payload,
        });
        return;
      }

      toast.error(result.error ?? "No se pudo guardar");
    });
  }

  function handleOnlyThisInstallment() {
    if (!installmentChoiceData || !expense || installmentIndex === undefined) return;
    startTransition(async () => {
      const result = await updateInstallmentAmount(
        expense.id,
        installmentIndex,
        installmentChoiceData.installment_amount,
        expense.card_id
      );
      if (result.success) {
        toast.success(`Cuota ${installmentIndex + 1}/${expense.installments} actualizada`);
        router.push(
          installmentChoiceData.card_id ? `/cards/${installmentChoiceData.card_id}` : "/expenses"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setInstallmentChoiceData(null);
    });
  }

  function handleAllInstallments() {
    if (!installmentChoiceData || !expense) return;
    startTransition(async () => {
      const result = await updateAllInstallmentAmounts(
        expense.id,
        installmentChoiceData.installment_amount,
        expense.card_id
      );
      if (result.success) {
        toast.success("Todas las cuotas actualizadas");
        router.push(
          installmentChoiceData.card_id ? `/cards/${installmentChoiceData.card_id}` : "/expenses"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setInstallmentChoiceData(null);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Tarjeta */}
        <div className="space-y-1.5">
          <Label>Tarjeta</Label>
          <Controller
            control={control}
            name="card_id"
            render={({ field }) => {
              const selectedCard = cards.find((c) => c.id === field.value);
              return (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.card_id && "border-destructive")}>
                    <SelectValue placeholder="Seleccioná la tarjeta">
                      {selectedCard
                        ? `${selectedCard.name} •••• ${selectedCard.last_four}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} •••• {card.last_four}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.card_id && (
            <p className="text-xs text-destructive">{errors.card_id.message}</p>
          )}
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <DescriptionAutocomplete
                id="description"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Ingresá el comercio…"
                invalid={!!errors.description}
                autoFocus={!expense}
              />
            )}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Monto + Cuotas */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="total_amount">Monto total</Label>
            <Controller
              control={control}
              name="total_amount"
              render={({ field }) => (
                <AmountInput
                  id="total_amount"
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
                  {formatCurrency((discountActive ? precioFinal : totalAmount) / installments)}
                </span>
              </p>
            )}
          </div>

          {/* Toggle descuento */}
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
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="discount_percentage">% de descuento</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="10"
                    inputMode="decimal"
                    className={cn(errors.discount_percentage && "border-destructive")}
                    {...register("discount_percentage", {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)),
                    })}
                  />
                  {errors.discount_percentage && (
                    <p className="text-xs text-destructive">
                      {errors.discount_percentage.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount_cap">
                    Tope reintegro{" "}
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="discount_cap"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Sin tope"
                    inputMode="decimal"
                    className={cn(errors.discount_cap && "border-destructive")}
                    {...register("discount_cap", {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)),
                    })}
                  />
                </div>
              </div>

              {totalAmount > 0 && (
                <div className="rounded-lg bg-card border border-border p-2.5 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Monto original</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento calculado</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{formatCurrency(discountCalculado)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-border pt-1">
                    <span>Precio final</span>
                    <span>{formatCurrency(precioFinal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sección avanzada (collapsable) */}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span>
            {showAdvanced ? "Ocultar" : "Más"} opciones (fecha, categoría, monto x cuota, notas, tags)
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
          />
        </button>

        {showAdvanced && (
          <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="expense_date">Fecha del consumo</Label>
              <Input
                id="expense_date"
                type="date"
                className={cn(errors.expense_date && "border-destructive")}
                {...register("expense_date")}
              />
              {errors.expense_date && (
                <p className="text-xs text-destructive">{errors.expense_date.message}</p>
              )}
            </div>

            <Separator />

            {/* Cuota calculada (manual override) */}
            <div className="space-y-1.5">
              <Label htmlFor="installment_amount">Monto por cuota</Label>
              <Controller
                control={control}
                name="installment_amount"
                render={({ field }) => (
                  <AmountInput
                    id="installment_amount"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? 0)}
                    invalid={!!errors.installment_amount}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Se calcula automáticamente
                {discountActive ? " sobre el precio con descuento" : ""}. Podés ajustarlo
                manualmente.
              </p>
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

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">
                Notas{" "}
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="Cualquier detalle adicional..."
                {...register("notes")}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags">
                Tags{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (separados por coma)
                </span>
              </Label>
              <Input
                id="tags"
                placeholder="Ej: viaje, trabajo, familia"
                defaultValue={(expense?.tags ?? []).join(", ")}
                onChange={(e) => {
                  const raw = e.target.value;
                  const tags = raw
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  setValue("tags", tags);
                }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="gradient-primary shadow-brand w-full font-semibold"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {expense ? "Guardando..." : "Registrando..."}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {expense ? "Guardar cambios" : "Registrar consumo"}
            </>
          )}
        </Button>
      </form>

      {/* Diálogo: ¿modificar solo esta cuota o todas? */}
      <AlertDialog
        open={!!installmentChoiceData}
        onOpenChange={(open) => {
          if (!open) setInstallmentChoiceData(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿A qué cuotas aplicás el cambio?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Nuevo importe
                  </p>
                  <p className="font-semibold text-foreground text-base">
                    {formatCurrency(installmentChoiceData?.installment_amount ?? 0)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                      {formatCurrency(expense?.installment_amount ?? 0)}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Este consumo tiene <strong>{expense?.installments} cuotas</strong>. Elegí si el
                  nuevo importe aplica solo a la cuota que estás viendo o a todas.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleOnlyThisInstallment} disabled={isPending} className="w-full">
              {isPending
                ? "Guardando..."
                : `Solo cuota ${
                    installmentIndex !== undefined ? installmentIndex + 1 : "—"
                  }/${expense?.installments}`}
            </Button>
            <Button
              variant="outline"
              onClick={handleAllInstallments}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Guardando..." : `Todas las cuotas (${expense?.installments})`}
            </Button>
            <AlertDialogCancel className="w-full" disabled={isPending}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  saveExpense(p, true);
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
