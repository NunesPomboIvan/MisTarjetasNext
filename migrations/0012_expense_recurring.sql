-- 0012_expense_recurring.sql
-- Consumos recurrentes (gastos fijos mensuales): seguro del auto, alquiler,
-- suscripciones, etc. A diferencia de las cuotas, no tienen fin: aparecen en
-- cada período desde su fecha en adelante. El monto mensual se guarda en
-- total_amount / installment_amount (installments queda en 1).

alter table expenses
  add column if not exists recurring boolean not null default false;

comment on column expenses.recurring is
  'true = consumo fijo que se repite todos los meses (sin fin). El monto mensual va en installment_amount.';
