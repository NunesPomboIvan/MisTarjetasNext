"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useEffect } from "react";
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
import { cn, formatDate } from "@/lib/utils";
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
          total_amount_with_interest: expense.total_amount_with_interest ?? undefined,
          installments: expense.installments,
          installment_amount: expense.installment_amount,
          expense_date: expense.expense_date,
          currency: expense.currency,
          paid: expense.paid,
          notes: expense.notes ?? "",
          tags: expense.tags ?? [],
        }
      : {
          card_id: defaultCardId ?? cards[0]?.id ?? "",
          currency: "ARS",
          installments: 1,
          paid: false,
          tags: [],
          expense_date: today,
        },
  });

  const totalAmount = watch("total_amount");
  const totalWithInterest = watch("total_amount_with_interest");
  const installments = watch("installments");

  // Auto-calcular cuota cuando cambia monto o cuotas
  useEffect(() => {
    const base = totalWithInterest ?? totalAmount;
    if (base && installments && installments >= 1) {
      const cuota = parseFloat((base / installments).toFixed(2));
      setValue("installment_amount", cuota);
    }
  }, [totalAmount, totalWithInterest, installments, setValue]);

  function onSubmit(data: ExpenseFormData) {
    startTransition(async () => {
      const result = expense
        ? await updateExpense(expense.id, data)
        : await createExpense(data);

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
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={cn(errors.card_id && "border-destructive")}>
                <SelectValue placeholder="Seleccioná la tarjeta" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} •••• {card.last_four}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

        {/* Monto con intereses (opcional) */}
        <div className="space-y-1.5">
          <Label htmlFor="total_amount_with_interest">
            Monto con intereses{" "}
            <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="total_amount_with_interest"
            type="number"
            step="0.01"
            min="0"
            placeholder="Solo si financiaste con intereses"
            inputMode="decimal"
            className={cn(errors.total_amount_with_interest && "border-destructive")}
            {...register("total_amount_with_interest", {
              valueAsNumber: true,
              setValueAs: (v) => (v === "" || isNaN(v) ? null : Number(v)),
            })}
          />
          {errors.total_amount_with_interest && (
            <p className="text-xs text-destructive">
              {errors.total_amount_with_interest.message}
            </p>
          )}
        </div>

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
            Se calcula automáticamente. Podés ajustarlo manualmente.
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
