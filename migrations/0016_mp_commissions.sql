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

-- RLS: cada usuario sólo ve y modifica su propia fila. (Supabase puede
-- habilitar RLS solo al crear la tabla; sin policy, el upsert falla.)
alter table user_settings enable row level security;

drop policy if exists "users manage their own settings" on user_settings;
create policy "users manage their own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
