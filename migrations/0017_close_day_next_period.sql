-- ============================================================
-- 0017_close_day_next_period.sql
-- Consumos del DÍA DE CIERRE: según el horario en que el comercio informa
-- la compra, el banco a veces los pasa al resumen siguiente.
--   cards.close_day_next   → preferencia por tarjeta: qué opción viene
--                            marcada al cargar un consumo el día de cierre.
--   expenses.next_period   → decisión por consumo: true = la compra (y sus
--                            cuotas) arranca en el resumen siguiente.
-- Los consumos existentes quedan como estaban (next_period null = normal).
-- Idempotente: el migrador re-ejecuta todos los archivos en cada corrida.
-- ============================================================

alter table cards
  add column if not exists close_day_next boolean not null default false;

alter table expenses
  add column if not exists next_period boolean default null;
