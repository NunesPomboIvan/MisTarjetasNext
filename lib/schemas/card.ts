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
  // TODO: re-habilitar validación de fecha pasada antes de release
  // (actualmente sin restricción para poder testear alertas de períodos vencidos)
  close_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de cierre inválida"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento inválida"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#f97316"),
  archived: z.boolean().default(false),
});

export type CardFormData = z.infer<typeof cardSchema>;
