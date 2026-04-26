import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(30, "Máximo 30 caracteres"),
  emoji: z
    .string()
    .min(1, "El emoji es requerido")
    .max(10, "Emoji inválido"),
  color_bg: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color de fondo inválido"),
  color_text: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color de texto inválido"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
