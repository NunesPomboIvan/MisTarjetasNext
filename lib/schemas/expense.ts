import { z } from "zod";

export const expenseSchema = z.object({
  card_id: z.string().uuid("Seleccioná una tarjeta"),
  category_id: z.string().uuid().nullable().optional(),
  description: z
    .string()
    .min(1, "La descripción es requerida")
    .max(200, "Máximo 200 caracteres"),
  total_amount: z
    .number()
    .positive("El monto debe ser mayor a 0"),
  installments: z
    .number()
    .int()
    .min(1, "Mínimo 1 cuota")
    .max(120, "Máximo 120 cuotas")
    .default(1),
  installment_amount: z
    .number()
    .positive("El monto de la cuota debe ser mayor a 0"),
  discount_percentage: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%")
    .nullable()
    .optional(),
  discount_cap: z
    .number()
    .min(0, "El tope debe ser mayor a 0")
    .nullable()
    .optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  tags: z.array(z.string().max(30)).max(10, "Máximo 10 tags").default([]),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const expenseFiltersSchema = z.object({
  card_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
  tags: z.array(z.string()).optional(),
  unpaid_only: z.boolean().optional(),
  search: z.string().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
