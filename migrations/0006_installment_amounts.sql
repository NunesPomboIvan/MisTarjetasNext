-- Agrega soporte para montos individuales por cuota.
-- Cuando un usuario edita una cuota específica, el monto se guarda acá
-- en lugar de pisar el installment_amount compartido por todas las cuotas.
--
-- Formato: { "0": 1500.00, "2": 1650.50 }
-- Clave  : índice 0-based de la cuota (string por JSON)
-- Valor  : monto de esa cuota en particular
-- Si un índice no está presente → usa installment_amount (valor por defecto)

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS installment_amounts jsonb DEFAULT NULL;

COMMENT ON COLUMN expenses.installment_amounts IS
  'Montos individuales por cuota (overrides). Clave = índice 0-based como string. Si es null, todas las cuotas usan installment_amount.';
