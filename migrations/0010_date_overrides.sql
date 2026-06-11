-- Historial de fechas de cierre/vencimiento por período.
-- Cuando el usuario carga las fechas reales de un período (se corren por
-- feriados/fines de semana), las nuevas rigen de ese período en adelante y
-- las anteriores quedan congeladas acá para los períodos pasados.
--
-- Formato: { "2026-05": { "close_date": "2026-05-23", "due_date": "2026-05-10" } }
-- Clave  : period key "YYYY-MM" HASTA el cual (inclusive) aplican esas fechas
-- Valor  : las fechas que regían hasta ese período
-- Los períodos posteriores a la mayor clave usan close_date/due_date de la tarjeta.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS date_overrides jsonb DEFAULT NULL;

COMMENT ON COLUMN cards.date_overrides IS
  'Historial de fechas de cierre/vencimiento. Clave = period key "YYYY-MM" hasta el cual aplican (inclusive). Si es null, todos los períodos usan close_date/due_date.';
