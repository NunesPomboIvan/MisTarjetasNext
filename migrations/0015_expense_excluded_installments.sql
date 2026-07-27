-- 0015_expense_excluded_installments.sql
-- Permite eliminar UN período puntual de un consumo recurrente (o de una
-- cuota normal) sin borrar el registro completo. Mismo criterio de índices
-- que installment_amounts (0-based, "período de la compra + índice meses"),
-- pero para exclusión en vez de override de monto.
-- Se usa junto con installment_amounts para el flujo "solo este período /
-- todos los períodos" al editar o eliminar un consumo fijo mensual.

alter table expenses
  add column if not exists excluded_installments integer[] not null default '{}';

comment on column expenses.excluded_installments is
  'Índices 0-based (período de la compra + N meses) que se excluyen del cálculo. Se usa para "eliminar solo este período" en consumos recurrentes.';
