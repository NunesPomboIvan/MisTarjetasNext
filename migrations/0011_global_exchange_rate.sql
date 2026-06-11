-- ============================================================
-- 0011_global_exchange_rate.sql
-- 1) Tipo de cambio GLOBAL con historial (Cuenta → Tipo de cambio).
-- 2) Override individual de TC en consumos (candado).
-- 3) Préstamos en dólares: TC en loans + TC efectivo por cuota.
-- Idempotente: el migrador re-ejecuta todos los archivos en cada corrida.
-- ============================================================

-- ── 1) Historial de TC global ────────────────────────────────
-- El TC vigente del usuario = la fila más reciente.
create table if not exists exchange_rate_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  rate       numeric(14,4) not null check (rate > 0),
  created_at timestamptz not null default now()
);

create index if not exists exchange_rate_history_user_created_idx
  on exchange_rate_history (user_id, created_at desc);

-- Igual que el resto del schema en esta instancia mono-usuario.
alter table exchange_rate_history disable row level security;

-- ── 2) Consumos: flag de override individual ─────────────────
-- false = sigue el TC global (un cambio global recalcula exchange_rate);
-- true  = TC personalizado, bloqueado ante cambios globales.
alter table expenses
  add column if not exists exchange_rate_custom boolean not null default false;

comment on column expenses.exchange_rate_custom is
  'true = TC personalizado para este consumo; los cambios del TC global no lo pisan.';

-- ── 3) Préstamos en USD ──────────────────────────────────────
-- loans.exchange_rate: TC de referencia del préstamo (se precarga al editar).
-- Los montos (total_amount, installment_amount, cuotas) quedan en la moneda
-- del préstamo; el equivalente ARS se calcula amount * exchange_rate,
-- igual que en expenses.
alter table loans
  add column if not exists exchange_rate numeric(14,4) default null;
alter table loans
  add column if not exists exchange_rate_custom boolean not null default false;

comment on column loans.exchange_rate is
  'Tipo de cambio (ARS por 1 USD) cuando currency = USD. NULL para préstamos en ARS.';

-- Cada cuota guarda su TC efectivo + flag de override individual.
alter table loan_installments
  add column if not exists exchange_rate numeric(14,4) default null;
alter table loan_installments
  add column if not exists exchange_rate_custom boolean not null default false;

comment on column loan_installments.exchange_rate is
  'TC efectivo de la cuota (ARS por 1 USD). NULL para préstamos en ARS.';
comment on column loan_installments.exchange_rate_custom is
  'true = TC personalizado para esta cuota; los cambios globales o del préstamo no la pisan.';
