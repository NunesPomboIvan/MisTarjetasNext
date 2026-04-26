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
  close_day: z
    .number()
    .int()
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  due_day: z
    .number()
    .int()
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#f97316"),
  archived: z.boolean().default(false),
});

export type CardFormData = z.infer<typeof cardSchema>;
