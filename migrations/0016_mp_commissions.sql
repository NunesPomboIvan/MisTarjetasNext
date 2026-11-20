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

-- Igual que el resto del schema en esta instancia mono-usuario.
alter table user_settings disable row level security;
