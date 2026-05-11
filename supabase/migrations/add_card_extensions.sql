-- Agrega soporte para banco, tarjetas adicionales, su titular,
-- límite de crédito, nombre del titular y vencimiento de la tarjeta.
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS bank text,
  ADD COLUMN IF NOT EXISTS is_extension boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_card_id uuid REFERENCES cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_limit numeric(14, 2),
  ADD COLUMN IF NOT EXISTS holder_name text,
  ADD COLUMN IF NOT EXISTS expiry text;
