-- ============================================================
-- 0009_expense_usd_negative.sql
-- 1) Tipo de cambio para consumos en dólares (se convierte a ARS en los totales)
-- 2) Permitir importes negativos (devoluciones / reintegros)
-- 3) Categoría preset "Gastos de tarjeta" (mantenimiento, IVA, intereses, etc.)
-- Idempotente: el migrador re-ejecuta todos los archivos en cada corrida.
-- ============================================================

-- ── 1) Tipo de cambio ────────────────────────────────────────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(14,4) DEFAULT NULL;

COMMENT ON COLUMN expenses.exchange_rate IS
  'Tipo de cambio (ARS por 1 USD) cuando currency = USD. NULL para consumos en ARS. Los totales suman el equivalente en pesos = total_amount * exchange_rate.';

-- ── 2) Permitir importes negativos (devoluciones) ────────────
-- El check inline original era (total_amount > 0); lo reemplazamos por (<> 0).
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_total_amount_check;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_total_amount_check CHECK (total_amount <> 0);

-- ── 3) Categoría preset "Gastos de tarjeta" ──────────────────
-- Preset global (user_id NULL). unique(user_id, name) no aplica con NULL,
-- por eso usamos un insert condicional para evitar duplicados al re-correr.
INSERT INTO categories (user_id, name, emoji, color_bg, color_text, is_preset)
SELECT NULL, 'Gastos de tarjeta', '🏦', '#e0e7ff', '#4338ca', true
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE user_id IS NULL AND name = 'Gastos de tarjeta'
);
