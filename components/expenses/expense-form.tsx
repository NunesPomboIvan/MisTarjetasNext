"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense";
import { createExpense, updateExpense } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CategoryPicker } from "./category-picker";
import { cn, formatCurrency } from "@/lib/utils";
import type { Card, Category, Expense } from "@/lib/supabase/database.types";
import { format } from "date-fns";

interface ExpenseFormProps {
  cards: Card[];
  categories: Category[];
  expense?: Expense;
  defaultCardId?: string;
}

export function ExpenseForm({ cards, categories, expense, defaultCardId }: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [discountActive, setDiscountActive] = useState<boolean>(
    !!expense?.discount_percentage
  );

  const today = format(new Date(), "yyyy-MM-dd");

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
          card_id: defaultCardId ?? cards[0]?.id ?? "",
          currency: "ARS",
          installments: 1,
          tags: [],
          expense_date: today,
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

  // Auto-calcular cuota cuando cambia monto, descuento o cuotas
  useEffect(() => {
    const base = discountActive ? precioFinal : totalAmount;
    if (base && installments && installments >= 1) {
      const cuota = parseFloat((base / installments).toFixed(2));
      setValue("installment_amount", cuota);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installments, discountActive, discountPct, discountCap, setValue]);

  // Al desactivar descuento, limpiar los campos
  function toggleDiscount(active: boolean) {
    setDiscountActive(active);
    if (!active) {
      setValue("discount_percentage", undefined);
      setValue("discount_cap", undefined);
    }
  }

  function onSubmit(data: ExpenseFormData) {
    // Si el descuento no está activo, asegurarse de enviar null
    const payload: ExpenseFormData = {
      ...data,
      discount_percentage: discountActive ? data.discount_percentage : null,
      discount_cap: discountActive ? data.discount_cap : null,
    };

    startTransition(async () => {
      const result = expense
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload);

      if (result.success) {
        toast.success(expense ? "Consumo actualizado" : "Consumo registrado");
        router.push(data.card_id ? `/cards/${data.card_id}` : "/expenses");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
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
                  {selectedCard ? `${selectedCard.name} •••• ${selectedCard.last_four}` : undefined}
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
        {errors.card_id && <p className="text-xs text-destructive">{errors.card_id.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          placeholder="Ej: Supermercado Coto"
          autoFocus={!expense}
          className={cn(errors.description && "border-destructive")}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

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

      {/* Montos */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="total_amount">Monto total</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              inputMode="decimal"
              className={cn(errors.total_amount && "border-destructive")}
              {...register("total_amount", { valueAsNumber: true })}
            />
            {errors.total_amount && (
              <p className="text-xs text-destructive">{errors.total_amount.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installments">Cuotas</Label>
            <Input
              id="installments"
              type="number"
              min={1}
              max={120}
              placeholder="1"
              inputMode="numeric"
              className={cn(errors.installments && "border-destructive")}
              {...register("installments", { valueAsNumber: true })}
            />
          </div>
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
                  <p className="text-xs text-destructive">{errors.discount_percentage.message}</p>
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

            {/* Resumen del descuento */}
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

        {/* Cuota calculada */}
        <div className="space-y-1.5">
          <Label htmlFor="installment_amount">Monto por cuota</Label>
          <Input
            id="installment_amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            inputMode="decimal"
            className={cn(errors.installment_amount && "border-destructive")}
            {...register("installment_amount", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Se calcula automáticamente{discountActive ? " sobre el precio con descuento" : ""}. Podés ajustarlo manualmente.
          </p>
        </div>
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
          Notas <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
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
          Tags <span className="text-xs font-normal text-muted-foreground">(separados por coma)</span>
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
  );
}
