-- ============================================================
-- 0014_card_period_payments.sql
-- Marca de pago por período de tarjeta.
-- Los períodos de tarjeta no están persistidos como filas (se calculan
-- dinámicamente sumando expenses del período de cierre); esta tabla solo
-- guarda el estado de pago por (tarjeta, período), mismo criterio que
-- loan_installments.paid / paid_date.
-- ============================================================
create table if not exists card_period_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  card_id      uuid not null references cards(id) on delete cascade,
  period_key   text not null, -- "YYYY-MM" (mes de cierre del período, ver lib/periods/calculate.ts)

  paid         boolean not null default true,
  paid_date    date,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (card_id, period_key)
);

create index if not exists card_period_payments_user_idx on card_period_payments (user_id);
create index if not exists card_period_payments_card_idx on card_period_payments (card_id);

create or replace trigger card_period_payments_updated_at
  before update on card_period_payments
  for each row execute function update_updated_at();

-- Mono-usuario con anon key, sin sesión real: mismo criterio que loans/titulares.
alter table card_period_payments disable row level security;
