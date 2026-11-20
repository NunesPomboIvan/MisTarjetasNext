import { z } from "zod";

export const expenseSchema = z
  .object({
    card_id: z.string().uuid("Seleccioná una tarjeta"),
    category_id: z.string().uuid().nullable().optional(),
    description: z
      .string()
      .min(1, "La descripción es requerida")
      .max(200, "Máximo 200 caracteres"),
    // Permite negativos (devoluciones / reintegros), pero no 0.
    total_amount: z
      .number()
      .refine((v) => v !== 0, "El monto no puede ser 0"),
    installments: z
      .number()
      .int()
      .min(1, "Mínimo 1 cuota")
      .max(120, "Máximo 120 cuotas")
      .default(1),
    installment_amount: z
      .number()
      .refine((v) => v !== 0, "El monto de la cuota no puede ser 0"),
    // Overrides por índice de cuota (0-based). Se usa tanto para editar el
    // importe de una cuota puntual como para la distribución del descuento
    // ("aplicar en la primera cuota" deja distinto el índice 0).
    installment_amounts: z.record(z.string(), z.number()).nullable().optional(),
    // Consumo fijo mensual: se repite todos los meses sin fin (installments = 1).
    recurring: z.boolean().default(false),
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
    // Tipo de cambio (ARS por 1 USD). Requerido cuando currency = USD.
    exchange_rate: z
      .number()
      .positive("El tipo de cambio debe ser mayor a 0")
      .nullable()
      .optional(),
    notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
    // Compra del día de cierre que el banco pasó al resumen siguiente.
    next_period: z.boolean().nullable().optional(),
    tags: z.array(z.string().max(30)).max(10, "Máximo 10 tags").default([]),
  })
  .superRefine((data, ctx) => {
    if (data.currency === "USD" && !(data.exchange_rate && data.exchange_rate > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exchange_rate"],
        message: "Ingresá el tipo de cambio",
      });
    }
    // Un consumo recurrente es un cargo mensual único, no se divide en cuotas.
    if (data.recurring && data.installments !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installments"],
        message: "Un consumo fijo mensual no puede tener cuotas",
      });
    }
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
