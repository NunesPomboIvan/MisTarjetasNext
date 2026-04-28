-- ============================================================
-- 0005_remove_paid_status.sql
-- Elimina el estado pagada/no pagada del consumo.
-- La lógica de pagos se maneja a nivel de período de tarjeta,
-- no a nivel de consumo individual.
-- ============================================================

ALTER TABLE expenses DROP COLUMN paid;
ALTER TABLE expenses DROP COLUMN paid_at;
