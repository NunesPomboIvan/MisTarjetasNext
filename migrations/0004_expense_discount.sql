-- ============================================================
-- 0004_expense_discount.sql
-- Agrega campos de descuento a los consumos.
-- total_amount_with_interest se mantiene en el schema de DB para
-- preservar datos históricos, pero ya no se usa en el formulario.
-- ============================================================

ALTER TABLE expenses ADD COLUMN discount_percentage numeric(5,2);
ALTER TABLE expenses ADD COLUMN discount_cap        numeric(14,2);

comment on column expenses.discount_percentage is 'Porcentaje de descuento/reintegro (0-100). Null si no aplica descuento.';
comment on column expenses.discount_cap        is 'Tope máximo del reintegro en la moneda del consumo. Null = sin tope.';
