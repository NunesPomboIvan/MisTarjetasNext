-- ============================================================
-- 0013_fix_exchange_rate_history_rls.sql
-- Asegura que exchange_rate_history no tenga RLS activo.
-- Idempotente: se puede ejecutar varias veces sin efecto.
-- ============================================================

-- Crear la tabla si por alguna razón no existe (idempotente).
create table if not exists exchange_rate_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  rate       numeric(14,4) not null check (rate > 0),
  created_at timestamptz not null default now()
);

create index if not exists exchange_rate_history_user_created_idx
  on exchange_rate_history (user_id, created_at desc);

-- Deshabilitar RLS (igual que en 0011, pero lo forzamos aquí para cuando
-- la tabla fue creada manualmente con RLS activo por defecto).
alter table exchange_rate_history disable row level security;
