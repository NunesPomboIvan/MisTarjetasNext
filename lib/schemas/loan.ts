import { z } from "zod";

export const loanInstallmentSchema = z.object({
  installment_number: z.number().int().min(1),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
});

export const loanSchema = z.object({
  description: z.string().min(1, "La descripción es requerida").max(80, "Máximo 80 caracteres"),
  bank: z.string().max(40).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#6366f1"),
  titular_id: z.string().uuid().nullable().optional(),
  total_amount: z.number().positive("El total debe ser mayor a 0"),
  installment_amount: z.number().positive("La cuota debe ser mayor a 0"),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de emisión inválida"),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  installments: z.array(loanInstallmentSchema).min(1, "Debe haber al menos una cuota"),
});

export type LoanFormData = z.infer<typeof loanSchema>;
export type LoanInstallmentInput = z.infer<typeof loanInstallmentSchema>;
