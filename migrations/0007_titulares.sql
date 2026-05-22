-- ============================================================
-- 0007_titulares.sql
-- Titulares (personas): agrupan tarjetas. Permite gestionar las
-- tarjetas de distintas personas (ej: Ivan, Camila) desde la misma
-- cuenta, cambiando el "titular activo" en la app.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TITULARES (Personas dueñas de tarjetas)
-- ─────────────────────────────────────────────────────────────
-- user_id es uuid plano (sin FK a auth.users): la app usa un user_id fijo
-- sintético que no existe en auth.users, igual que el resto de las tablas
-- en esta instancia.
create table if not exists titulares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),

  unique (user_id, name)
);

-- Si la tabla ya se había creado con la FK a auth.users, la quitamos.
alter table titulares drop constraint if exists titulares_user_id_fkey;

-- NOTA sobre RLS: esta app es de uso personal mono-usuario, accede con la
-- anon key y un user_id fijo (ver lib/supabase/server.ts), sin sesión real de
-- auth. Las tablas existentes operan sin RLS efectivo en esta instancia, así
-- que NO habilitamos RLS en titulares: con políticas basadas en auth.uid()
-- (que es null sin login) las lecturas anónimas volverían vacías y el switcher
-- quedaría oculto. Si en el futuro se agrega login real, habilitar RLS acá y
-- en cards/expenses de forma coherente.

-- ─────────────────────────────────────────────────────────────
-- CARDS: columna titular_id
-- on delete set null → borrar un titular no borra sus tarjetas,
-- solo las deja sin asignar (caen en el titular por defecto al resolver).
-- ─────────────────────────────────────────────────────────────
alter table cards
  add column if not exists titular_id uuid references titulares(id) on delete set null;

create index if not exists cards_titular_idx on cards (titular_id);

-- ─────────────────────────────────────────────────────────────
-- SEED + BACKFILL para la app mono-usuario.
-- Crea el titular "Ivan" y asigna todas las tarjetas existentes a él.
-- Corre en el SQL editor (rol postgres) → ignora RLS.
-- ─────────────────────────────────────────────────────────────
insert into titulares (user_id, name, color)
values ('00000000-0000-0000-0000-000000000001', 'Ivan', '#6366f1')
on conflict (user_id, name) do nothing;

update cards
set titular_id = (
  select id from titulares
  where user_id = '00000000-0000-0000-0000-000000000001' and name = 'Ivan'
  limit 1
)
where titular_id is null
  and user_id = '00000000-0000-0000-0000-000000000001';
