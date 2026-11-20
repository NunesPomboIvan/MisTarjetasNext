import { z } from "zod";

export const cardSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres"),
  type: z.enum(["visa", "mastercard", "amex", "naranja", "cabal", "other"], {
    error: "Seleccioná un tipo de tarjeta",
  }),
  last_four: z
    .string()
    .length(4, "Deben ser exactamente 4 dígitos")
    .regex(/^\d{4}$/, "Solo se permiten números"),
  close_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de cierre inválida"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento inválida"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#6366f1"),
  bank: z.string().max(40).nullable().optional(),
  is_extension: z.boolean().default(false),
  parent_card_id: z.string().uuid().nullable().optional(),
  credit_limit: z
    .number()
    .nonnegative("El límite debe ser mayor o igual a 0")
    .nullable()
    .optional(),
  holder_name: z.string().max(60).nullable().optional(),
  /** Vencimiento de la tarjeta en formato MM/YY */
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Formato MM/YY")
    .nullable()
    .optional(),
  archived: z.boolean().default(false),
  /** Consumos del día de cierre: opción "resumen siguiente" marcada por defecto. */
  close_day_next: z.boolean().optional(),
});

export type CardFormData = z.infer<typeof cardSchema>;
