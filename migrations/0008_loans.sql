-- ============================================================
-- 0008_loans.sql
-- Préstamos bancarios + cuotas.
-- Un préstamo tiene N cuotas con vencimientos individuales.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- LOANS (Préstamos bancarios)
-- ─────────────────────────────────────────────────────────────
-- user_id es uuid plano (sin FK a auth.users): la app mono-usuario usa
-- un user_id fijo sintético — mismo criterio que cards/titulares.
create table if not exists loans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  titular_id          uuid references titulares(id) on delete set null,

  description         text not null,
  bank                text,
  color               text not null default '#6366f1',

  total_amount        numeric(14,2) not null check (total_amount > 0),
  -- Monto base por cuota. Se rellena al crear pero cada cuota tiene su
  -- propio monto en loan_installments.amount (permite cuotas distintas).
  installment_amount  numeric(14,2) not null check (installment_amount > 0),

  issue_date          date not null,
  currency            text not null default 'ARS' check (currency in ('ARS','USD')),

  archived            boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists loans_user_idx     on loans (user_id);
create index if not exists loans_titular_idx  on loans (titular_id);

-- ─────────────────────────────────────────────────────────────
-- LOAN_INSTALLMENTS (Cuotas de cada préstamo)
-- ─────────────────────────────────────────────────────────────
create table if not exists loan_installments (
  id                  uuid primary key default gen_random_uuid(),
  loan_id             uuid not null references loans(id) on delete cascade,
  user_id             uuid not null,

  installment_number  smallint not null check (installment_number >= 1),
  amount              numeric(14,2) not null check (amount > 0),
  due_date            date not null,

  paid                boolean not null default false,
  paid_date           date,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (loan_id, installment_number)
);

create index if not exists loan_installments_loan_idx       on loan_installments (loan_id);
create index if not exists loan_installments_user_due_idx   on loan_installments (user_id, due_date);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- (reutiliza la función update_updated_at() definida en 0001)
-- ─────────────────────────────────────────────────────────────
create or replace trigger loans_updated_at
  before update on loans
  for each row execute function update_updated_at();

create or replace trigger loan_installments_updated_at
  before update on loan_installments
  for each row execute function update_updated_at();

-- NOTA sobre RLS: igual que titulares — la app es mono-usuario con anon
-- key y user_id fijo, sin sesión real. No habilitamos RLS para mantener
-- coherencia con el resto del schema en esta instancia.
