-- ============================================================
-- 0003_close_due_dates.sql
-- Reemplaza close_day/due_day (entero 1-31) por close_date/due_date (fecha completa).
-- Los cálculos de período usan solo el día del mes de cada fecha almacenada.
-- ============================================================

ALTER TABLE cards ADD COLUMN close_date date;
ALTER TABLE cards ADD COLUMN due_date   date;

-- Migrar datos existentes usando enero 2026 como mes de referencia neutral.
UPDATE cards SET
  close_date = make_date(2026, 1, LEAST(close_day::int, 31)),
  due_date   = make_date(2026, 1, LEAST(due_day::int, 31));

ALTER TABLE cards ALTER COLUMN close_date SET NOT NULL;
ALTER TABLE cards ALTER COLUMN due_date   SET NOT NULL;

ALTER TABLE cards DROP COLUMN close_day;
ALTER TABLE cards DROP COLUMN due_day;

comment on column cards.close_date is 'Fecha de referencia de cierre. Solo el día del mes se usa en los cálculos de período.';
comment on column cards.due_date   is 'Fecha de referencia de vencimiento. Solo el día del mes se usa en los cálculos.';
