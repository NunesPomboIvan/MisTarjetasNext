-- ============================================================
-- 0001_initial_schema.sql
-- Esquema inicial: cards, categories, expenses, budgets
-- ============================================================

-- Extensión para UUIDs (ya viene habilitada en Supabase)
-- create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- CARDS (Tarjetas de crédito)
-- ─────────────────────────────────────────────────────────────
create table if not exists cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('visa','mastercard','amex','naranja','cabal','other')),
  last_four   text not null check (last_four ~ '^[0-9]{4}$'),

  -- Día del mes (1-31), NO fecha absoluta.
  -- Eliminamos la necesidad de "actualizar fechas" cada mes.
  close_day   smallint not null check (close_day between 1 and 31),
  due_day     smallint not null check (due_day between 1 and 31),

  color       text not null default '#f97316',
  archived    boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, name, last_four)
);

comment on column cards.close_day is 'Día del mes en que cierra el período (1-31). En meses cortos se usa el último día disponible.';
comment on column cards.due_day   is 'Día del mes siguiente en que vence el pago (1-31).';

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES (Categorías de consumo)
-- ─────────────────────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  -- null = categoría preset global (visible para todos los usuarios autenticados)
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  emoji       text not null,
  color_bg    text not null,
  color_text  text not null,
  is_preset   boolean not null default false,
  created_at  timestamptz not null default now(),

  -- Un usuario no puede tener dos categorías con el mismo nombre
  unique (user_id, name)
);

comment on column categories.user_id is 'NULL para categorías preset globales. UUID del usuario para categorías personalizadas.';

-- ─────────────────────────────────────────────────────────────
-- EXPENSES (Consumos)
-- ─────────────────────────────────────────────────────────────
create table if not exists expenses (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  card_id                     uuid not null references cards(id) on delete cascade,
  category_id                 uuid references categories(id) on delete set null,

  description                 text not null,

  -- Monto total del consumo (sin intereses)
  total_amount                numeric(14,2) not null check (total_amount > 0),

  -- Monto total con intereses (si se financió). Puede ser null si no hay intereses.
  total_amount_with_interest  numeric(14,2),

  -- Número total de cuotas (1 = contado)
  installments                smallint not null default 1 check (installments between 1 and 120),

  -- Monto de cada cuota (calculado: total / cuotas, o total_with_interest / cuotas)
  installment_amount          numeric(14,2) not null,

  -- Fecha de la compra (determina en qué período cae la primera cuota)
  expense_date                date not null,

  currency                    text not null default 'ARS' check (currency in ('ARS','USD')),

  -- El usuario puede marcar manualmente como pagado
  paid                        boolean not null default false,
  paid_at                     timestamptz,

  notes                       text,
  tags                        text[] not null default array[]::text[],

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Índices para las queries más frecuentes
create index if not exists expenses_card_date_idx  on expenses (card_id, expense_date desc);
create index if not exists expenses_user_date_idx  on expenses (user_id, expense_date desc);
create index if not exists expenses_category_idx   on expenses (category_id);
create index if not exists expenses_tags_idx       on expenses using gin (tags);

-- Full-text search sobre descripción
create index if not exists expenses_description_fts_idx
  on expenses using gin (to_tsvector('spanish', description));

-- ─────────────────────────────────────────────────────────────
-- BUDGETS (Presupuestos por categoría)
-- ─────────────────────────────────────────────────────────────
create table if not exists budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete cascade,
  amount       numeric(14,2) not null check (amount > 0),
  period       text not null default 'monthly' check (period in ('monthly')),
  created_at   timestamptz not null default now(),

  unique (user_id, category_id)
);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- ─────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger cards_updated_at
  before update on cards
  for each row execute function update_updated_at();

create or replace trigger expenses_updated_at
  before update on expenses
  for each row execute function update_updated_at();
