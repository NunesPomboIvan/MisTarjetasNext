# Prompt para Claude Code — Migración a Next.js + Vercel + Cloud

> Copiá todo lo que está debajo de la línea y pegalo en Claude Code dentro de una carpeta vacía.
> Si ya tenés un repo, podés correrlo dentro de un subdirectorio nuevo (`apps/web` por ejemplo).

---

## CONTEXTO DEL PROYECTO

Estoy migrando una aplicación web personal de gestión de tarjetas de crédito desde una single-page HTML vanilla a una aplicación Next.js 14 con persistencia en la nube. La aplicación es para uso personal en Argentina, mobile-first, y se desplegará en Vercel. Soy el único usuario (por ahora), pero quiero diseñar la base de datos pensando que en el futuro pueda agregar familiares.

La app vanilla actual (que voy a adjuntar como referencia más abajo) tiene aproximadamente 2000 líneas en un único archivo HTML. La conozco bien y te voy a describir el modelo de datos, las funcionalidades y las decisiones de diseño que quiero conservar. **No copies el HTML viejo línea por línea** — usalo solo como especificación funcional. Implementá todo desde cero con buenas prácticas de Next.js.

## STACK TÉCNICO REQUERIDO

- **Framework:** Next.js 14+ con App Router (no Pages Router)
- **Lenguaje:** TypeScript con `strict: true`
- **Estilos:** Tailwind CSS v3 + CSS Variables para tematización (light/dark)
- **UI primitives:** shadcn/ui (instalá los componentes que necesites: Dialog, Select, Calendar, Sheet, Toast, Card, Button, Input, Label, Tabs, DropdownMenu, AlertDialog)
- **Iconos:** lucide-react
- **Base de datos:** Supabase (Postgres) — vamos a usar el cliente `@supabase/supabase-js` desde Server Components y Server Actions
- **Auth:** Supabase Auth (email + OTP magic link). Diseñá las tablas con `user_id` foreign key y RLS desde el día uno
- **Validación:** Zod para schemas (cliente y servidor compartidos)
- **Estado del servidor:** Server Components + Server Actions (Next.js 14). Para mutations optimistas usá `useOptimistic` y `useTransition`
- **Estado del cliente:** mínimo posible. Solo Zustand si hace falta para UI state global; preferí prop drilling y Server Components
- **Forms:** react-hook-form + zod resolver
- **Charts:** Recharts (para gráficos de gastos por categoría y tendencias mensuales)
- **Date handling:** date-fns con locale `es` (NO uses dayjs ni moment)
- **Currency:** `Intl.NumberFormat('es-AR', { currency: 'ARS' })`
- **PWA:** next-pwa o configuración manual con manifest + service worker. Debe ser instalable desde Safari iOS
- **Linting:** ESLint config oficial de Next.js + Prettier
- **Package manager:** pnpm

## ESTRUCTURA DE CARPETAS ESPERADA

```
app/
  (auth)/
    login/page.tsx
    callback/route.ts
  (app)/
    layout.tsx                       # Layout autenticado con bottom nav
    page.tsx                         # Dashboard / resumen global
    cards/
      page.tsx                       # Lista de tarjetas
      [id]/
        page.tsx                     # Detalle de tarjeta + períodos
        edit/page.tsx
      new/page.tsx
    expenses/
      page.tsx                       # Listado global de consumos con filtros
      new/page.tsx
    stats/page.tsx                   # Gráficos y estadísticas
    settings/page.tsx                # Export/import, categorías, perfil
  api/
    push/subscribe/route.ts          # Web Push (futuro)
  layout.tsx                         # Root layout
  globals.css
  manifest.ts                        # Manifest dinámico de Next 14

components/
  ui/                                # shadcn/ui generated
  cards/
    card-list.tsx
    card-detail.tsx
    card-form.tsx
    period-navigator.tsx
  expenses/
    expense-form.tsx
    expense-list.tsx
    expense-item.tsx
    category-picker.tsx
  shared/
    bottom-nav.tsx
    money.tsx                        # <Money amount={...} />
    date-picker.tsx
    empty-state.tsx
  charts/
    spending-by-category.tsx
    monthly-trend.tsx

lib/
  supabase/
    client.ts                        # Browser client
    server.ts                        # Server client (cookies)
    types.ts                         # Generado con `supabase gen types`
  schemas/
    card.ts                          # Zod schema
    expense.ts
    category.ts
  periods/
    calculate.ts                     # Lógica de cálculo de períodos (PURE FUNCTIONS, con tests)
  utils.ts                           # cn(), formatCurrency(), formatDate()

actions/
  cards.ts                           # createCard, updateCard, deleteCard
  expenses.ts
  categories.ts
  backup.ts                          # exportData, importData

migrations/                          # SQL migrations para Supabase
  0001_initial_schema.sql
  0002_rls_policies.sql

tests/
  periods.test.ts                    # Tests de cálculo de períodos con Vitest

public/
  icon-192.png
  icon-512.png
  apple-touch-icon.png
```

## MODELO DE DATOS (Postgres / Supabase)

Generá las migraciones SQL en `migrations/`. Diseño relacional, NO denormalizar:

```sql
-- Cards (tarjetas)
create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('visa','mastercard','amex','naranja','cabal','other')),
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  -- IMPORTANTE: guardar como DÍA DEL MES (1-31), no fecha absoluta.
  -- Esto elimina la necesidad de "actualizar fechas" cada mes.
  close_day smallint not null check (close_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  color text default '#f97316',
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, name, last_four)
);

-- Categories (predefinidas + custom por usuario)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = preset global
  name text not null,
  emoji text not null,
  color_bg text not null,
  color_text text not null,
  is_preset boolean default false,
  created_at timestamptz default now()
);

-- Expenses (consumos)
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  description text not null,
  total_amount numeric(14,2) not null check (total_amount > 0),
  -- Si tiene intereses, guardamos el monto efectivamente pagado
  total_amount_with_interest numeric(14,2),
  installments smallint not null default 1 check (installments between 1 and 120),
  installment_amount numeric(14,2) not null,
  expense_date date not null,
  currency text not null default 'ARS' check (currency in ('ARS','USD')),
  paid boolean default false,                       -- marcado como pagado por el usuario
  notes text,
  tags text[] default array[]::text[],              -- etiquetas libres
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index expenses_card_date_idx on expenses(card_id, expense_date desc);
create index expenses_user_date_idx on expenses(user_id, expense_date desc);

-- Budgets (presupuesto por categoría, opcional)
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  period text not null default 'monthly' check (period in ('monthly')),
  created_at timestamptz default now(),
  unique(user_id, category_id)
);

-- RLS habilitado en TODAS las tablas con policy "users only see their own data"
```

Generá una segunda migración con las RLS policies. Cargá las categorías preset (Supermercado, Comida, Transporte, Salud, Entretenimiento, Ropa, Servicios, Otro) con `is_preset = true` y `user_id = null`. La policy de SELECT en `categories` debe permitir ver presets a todos los usuarios autenticados.

## LÓGICA DE PERÍODOS (CRÍTICA)

Esto es la parte más compleja del sistema. Implementala en `lib/periods/calculate.ts` como funciones puras (sin acceso a DB) y testeala con Vitest.

**Concepto:** una tarjeta con `close_day=23` y `due_day=10` significa que cada mes cierra el 23 y vence el 10 del mes siguiente. Un período "Marzo 2026" abarca desde el 24/feb hasta el 23/mar y vence el 10/abr.

**Funciones requeridas:**

```ts
type Period = {
  start: Date;       // 24/feb a las 00:00
  end: Date;         // 23/mar a las 23:59:59
  due: Date;         // 10/abr a las 00:00
  status: 'past' | 'current' | 'future';
  label: string;     // "Marzo 2026"
  key: string;       // "2026-03" — clave estable para comparar
};

function getPeriodForDate(card: Card, date: Date): Period;
function getCurrentPeriod(card: Card): Period;
function getPeriodByOffset(card: Card, offsetMonths: number): Period;
function getPeriods(card: Card, range: { past: number, future: number }): Period[];
function expenseFallsInPeriod(expense: Expense, period: Period, installmentIndex?: number): boolean;
function getInstallmentDates(expense: Expense): Date[]; // Una fecha por cada cuota
```

**Casos borde a manejar y testear:**
- Tarjeta cierra el 31 → en febrero usar el 28/29 (último día del mes)
- Vencimiento ANTES del cierre (ej: cierra el 28, vence el 5 del mes siguiente)
- Cuotas que cruzan años (cuota 12 de 12 cae en otro año)
- Compras con fecha posterior al cierre del período actual: van al período siguiente
- Comparación de fechas siempre con timezone Argentina (`America/Argentina/Buenos_Aires`)

Escribí al menos 15 tests cubriendo estos casos. Si encontrás ambigüedad, documentala en un comentario y elegí la opción más razonable.

## FUNCIONALIDADES A IMPLEMENTAR

### Core (MVP, primera iteración)

1. **Auth con Supabase magic link** — login por email, redirección a `/`
2. **Dashboard (`/`)** — total a pagar este mes (suma de períodos vigentes), próximo vencimiento más cercano con countdown, top 3 categorías de gasto
3. **Lista de tarjetas (`/cards`)** — grilla con logo, nombre, total del período actual, día de cierre/vencimiento. Click → detalle
4. **Detalle de tarjeta (`/cards/[id]`)** — navegador de períodos (←/→), total del período, lista de consumos, botón "+ Agregar consumo"
5. **CRUD de tarjetas** — formulario con validación Zod, día del mes para cierre y vencimiento (no fechas absolutas), detección de duplicados
6. **CRUD de consumos** — categoría, descripción, monto, fecha, cuotas (con campo opcional de "monto total con intereses"), notas, tags
7. **Listado global de consumos (`/expenses`)** con filtros: por tarjeta, categoría, rango de fechas, rango de monto, tags, "solo no pagados", búsqueda full-text en descripción
8. **Categorías personalizadas** — el usuario puede crear/editar/eliminar las suyas, ver las preset
9. **Settings (`/settings`)** — perfil, export a JSON, import desde JSON con confirmación, gestión de categorías, logout

### Importante (segunda iteración)

10. **Marcar consumo como pagado** — con timestamp de cuándo se marcó
11. **Modo oscuro** — toggle en settings, persistido, respeta `prefers-color-scheme` por defecto
12. **Estadísticas (`/stats`)** — donut de gasto por categoría, line chart de gasto mensual últimos 12 meses, comparación período actual vs anterior, top 5 consumos
13. **Presupuestos por categoría** — con barra de progreso visible en el dashboard y alerta cuando se supera el 80%
14. **PWA instalable** — manifest, service worker con cache de la shell, iconos correctos para iOS

### Nice-to-have (futura)

15. **Multi-currency** — soporte ARS/USD con conversión opcional
16. **Vista mensual consolidada** — todos los consumos de un mes calendario, agrupados por tarjeta
17. **Tags-based reports** — filtrar por tag (ej: "viaje Bariloche") y ver el total

NO implementes Web Push ni notificaciones todavía. Dejá los stubs en `/api/push/`.

## DISEÑO VISUAL

Mantené la estética del proyecto original:

**Paleta light:**
- `--bg: #fffbf5`
- `--bg-card: #ffffff`
- `--bg-secondary: #fef6ee`
- `--text: #292524`
- `--text-secondary: #78716c`
- `--primary: #f97316` (naranja)
- `--secondary: #fb923c` (coral)
- `--accent: #eab308`
- `--success: #22c55e`
- `--border: #e7e5e4`

**Paleta dark:**
- `--bg: #1c1917`
- `--bg-card: #292524`
- `--bg-secondary: #44403c`
- `--text: #fafaf9`
- `--text-secondary: #a8a29e`
- `--primary: #fb923c`
- `--border: #44403c`

**Tipografía:** Inter de Google Fonts (`next/font/google`). Pesos 400, 500, 600, 700.

**Principios:**
- Mobile-first (375px viewport como referencia, max-width 720px en desktop)
- Bordes redondeados generosos (10-20px)
- Sombras sutiles multicapa
- Gradientes lineales `135deg, primary, secondary` en CTAs principales y montos destacados
- Bottom nav con backdrop blur (glassmorphism)
- Transitions con `cubic-bezier(0.34, 1.56, 0.64, 1)` para overshoot sutil
- Safe areas de iOS bien manejadas (`env(safe-area-inset-*)`)
- Tap targets mínimos 44x44px

**Componentes especiales a respetar visualmente:**
- Botones gradient con sombra naranja `0 4px 12px rgba(249,115,22,0.3)`
- Badges de cuotas en amarillo/naranja claro
- Status pills de período: verde (current), naranja (future), gris (past)
- Logo SVG por tipo de tarjeta (Visa azul, Mastercard rojo+amarillo, etc.)

## DECISIONES TÉCNICAS A SEGUIR

1. **Server Components por default.** Solo agregá `'use client'` cuando realmente lo necesites (interactividad, hooks, browser APIs).
2. **Server Actions** para todas las mutations. Nada de API routes innecesarias.
3. **Validación con Zod** en el cliente Y en el servidor. Definí los schemas una sola vez en `lib/schemas/`.
4. **Optimistic updates** con `useOptimistic` para que las acciones se sientan instantáneas.
5. **Revalidación selectiva** con `revalidatePath` o `revalidateTag` después de cada mutation, no full reloads.
6. **Loading states** con `loading.tsx` por ruta y Suspense boundaries para streaming.
7. **Error boundaries** con `error.tsx` por ruta.
8. **Type safety end-to-end** — los tipos de Supabase generados deben fluir hasta los componentes. Cero `any`.
9. **Accessibility** — labels asociados, ARIA donde corresponda, navegación por teclado funcional, contraste AA mínimo.
10. **Migrations versionadas** — todas en `migrations/` con prefijo numérico, idempotentes cuando sea posible.

## ENTREGABLES Y ORDEN DE TRABAJO

Trabajá en este orden y commiteá al final de cada paso. Después de cada paso, pausá y mostrame qué hiciste antes de seguir.

1. **Setup inicial:** `pnpm create next-app` con TS, Tailwind, App Router. Instalá dependencias. Configurá ESLint + Prettier. Generá `manifest.ts` y los iconos.
2. **Supabase:** schema SQL, RLS policies, seed de categorías preset, types generados, clients (browser + server).
3. **Auth flow:** login page con magic link, callback, middleware que protege `(app)/*`.
4. **Lógica de períodos:** funciones puras + tests Vitest.
5. **Schemas Zod + Server Actions** para cards, expenses, categories.
6. **UI básica:** layout autenticado con bottom nav, lista de tarjetas, formulario de tarjeta.
7. **Detalle de tarjeta:** navegador de períodos, lista de consumos del período.
8. **CRUD de consumos** con cuotas y categorías custom.
9. **Listado global con filtros.**
10. **Settings:** export/import, gestión de categorías, modo oscuro.
11. **Dashboard** con resumen.
12. **Estadísticas y presupuestos.**
13. **PWA:** manifest, service worker, optimización de carga.
14. **Deploy a Vercel** con variables de entorno documentadas en README.

Para cada paso, escribí un README breve actualizado con qué se agregó y cómo se usa.

## CÓMO ARRANCAR

Empezá creando un README.md con la estructura de la app, luego el `package.json` con todas las dependencias, después los archivos de configuración (next.config.ts, tailwind.config.ts, tsconfig.json, eslint, prettier), y recién ahí el código.

Necesito poder correr esto localmente con:

```bash
pnpm install
cp .env.example .env.local   # completar variables
pnpm db:migrate              # script que aplica migrations a Supabase
pnpm db:seed                 # script que inserta categorías preset
pnpm dev
```

Asumí que tengo cuenta de Supabase y de Vercel pero no las tengo configuradas. Documentá los pasos para crearlas y conectarlas.

## REFERENCIA: APP ACTUAL EN VANILLA JS

Voy a adjuntar el archivo `gestor-tarjetas-final.html` al final de este prompt. Usalo SOLO para entender el comportamiento exacto de los flujos (validaciones, mensajes, edge cases). No copies código JavaScript directo. La nueva versión debe ser idiomática de Next.js 14 / React Server Components.

**Diferencias importantes vs la versión vieja:**
- En la nueva versión, las fechas de tarjeta son **días del mes** (1-31), no fechas absolutas. Esto elimina toda la lógica de "actualizar fechas" y `periodsHistory[]`.
- Los datos viven en Postgres con RLS, no en localStorage.
- Hay autenticación.
- El modelo soporta multi-usuario aunque sea para uso personal.

## CONFIRMACIÓN

Antes de empezar, leé este prompt completo, hacé un plan de los primeros 3 pasos, y pedime confirmación. No empieces a generar código hasta que apruebe el plan.
