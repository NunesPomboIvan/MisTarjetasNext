-- ============================================================
-- 0002_rls_policies.sql
-- Row Level Security + seed de categorías preset
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Habilitar RLS en todas las tablas
-- ─────────────────────────────────────────────────────────────
alter table cards      enable row level security;
alter table categories enable row level security;
alter table expenses   enable row level security;
alter table budgets    enable row level security;

-- ─────────────────────────────────────────────────────────────
-- CARDS policies
-- ─────────────────────────────────────────────────────────────
create policy "users can view their own cards"
  on cards for select
  using (auth.uid() = user_id);

create policy "users can insert their own cards"
  on cards for insert
  with check (auth.uid() = user_id);

create policy "users can update their own cards"
  on cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own cards"
  on cards for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES policies
-- Los usuarios ven:
--   a) Sus propias categorías (user_id = auth.uid())
--   b) Las categorías preset globales (user_id IS NULL, is_preset = true)
-- ─────────────────────────────────────────────────────────────
create policy "users can view their categories and presets"
  on categories for select
  using (
    auth.uid() = user_id
    or (user_id is null and is_preset = true)
  );

create policy "users can insert their own categories"
  on categories for insert
  with check (auth.uid() = user_id and is_preset = false);

create policy "users can update their own categories"
  on categories for update
  using (auth.uid() = user_id and is_preset = false)
  with check (auth.uid() = user_id and is_preset = false);

create policy "users can delete their own categories"
  on categories for delete
  using (auth.uid() = user_id and is_preset = false);

-- ─────────────────────────────────────────────────────────────
-- EXPENSES policies
-- ─────────────────────────────────────────────────────────────
create policy "users can view their own expenses"
  on expenses for select
  using (auth.uid() = user_id);

create policy "users can insert their own expenses"
  on expenses for insert
  with check (auth.uid() = user_id);

create policy "users can update their own expenses"
  on expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own expenses"
  on expenses for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- BUDGETS policies
-- ─────────────────────────────────────────────────────────────
create policy "users can view their own budgets"
  on budgets for select
  using (auth.uid() = user_id);

create policy "users can insert their own budgets"
  on budgets for insert
  with check (auth.uid() = user_id);

create policy "users can update their own budgets"
  on budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own budgets"
  on budgets for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SEED: Categorías preset
-- user_id = null significa que son globales (todos las ven)
-- ─────────────────────────────────────────────────────────────
insert into categories (user_id, name, emoji, color_bg, color_text, is_preset)
values
  (null, 'Supermercado',   '🛒', '#dcfce7', '#15803d', true),
  (null, 'Comida',         '🍔', '#fef9c3', '#a16207', true),
  (null, 'Transporte',     '🚗', '#dbeafe', '#1d4ed8', true),
  (null, 'Salud',          '💊', '#fce7f3', '#9d174d', true),
  (null, 'Entretenimiento','🎬', '#ede9fe', '#6d28d9', true),
  (null, 'Ropa',           '👕', '#fef3c7', '#d97706', true),
  (null, 'Servicios',      '⚡', '#e0f2fe', '#0369a1', true),
  (null, 'Viajes',         '✈️', '#f0fdf4', '#15803d', true),
  (null, 'Tecnología',     '💻', '#f1f5f9', '#475569', true),
  (null, 'Otro',           '📦', '#f5f5f4', '#57534e', true)
on conflict (user_id, name) do nothing;
