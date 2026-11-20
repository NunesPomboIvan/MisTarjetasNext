-- ============================================================
-- 0016_mp_commissions.sql
-- Comisión de Mercado Pago por pagar con tarjeta de crédito (ej. una
-- transferencia): % por red de tarjeta, configurable en Cuenta → Ajustes.
-- El alta de consumo ofrece sumarla al importe del comprobante.
-- Idempotente: el migrador re-ejecuta todos los archivos en cada corrida.
-- ============================================================

create table if not exists user_settings (
  user_id        uuid primary key,
  -- { "visa": 6.53, "amex": 6.99, ... } — % por red (CardType).
  mp_commissions jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- Igual que el resto del schema en esta instancia mono-usuario: la app usa
-- la anon key sin login (auth.uid() es null), así que una policy por
-- usuario bloquearía todo. Supabase puede habilitar RLS solo al crear la
-- tabla: se deshace explícitamente.
drop policy if exists "users manage their own settings" on user_settings;
alter table user_settings disable row level security;
