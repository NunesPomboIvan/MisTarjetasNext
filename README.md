# Mis Tarjetas 💳

Aplicación personal de gestión de tarjetas de crédito. Mobile-first, PWA instalable, pensada para uso en Argentina (ARS).

## Stack

- **Next.js 16** — App Router + Server Components + Server Actions
- **TypeScript** — `strict: true`
- **Tailwind CSS v4** + shadcn/ui
- **Supabase** — Postgres + Auth (magic link) + RLS
- **Zod** — validación cliente/servidor
- **Recharts** — gráficos
- **date-fns** — manejo de fechas con locale `es`
- **Vitest** — tests unitarios

## Setup local

### 1. Clonar e instalar

```bash
npm install
cp .env.example .env.local
# Completar las variables en .env.local
```

### 2. Configurar Supabase

1. Crear cuenta en [supabase.com](https://supabase.com) → New project
2. Ir a **Settings → API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (solo local)
   - Project ID → `SUPABASE_PROJECT_ID`
3. Ir a **Authentication → Providers** y habilitar **Email** con "Confirm email" desactivado (usamos OTP magic link)
4. En **Authentication → URL Configuration** agregar `http://localhost:3000/auth/callback` a los Redirect URLs

### 3. Aplicar migraciones

```bash
npm run db:migrate   # Crea tablas y habilita RLS
npm run db:seed      # Inserta categorías preset
```

### 4. Correr localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Lint con ESLint |
| `npm run format` | Formatear con Prettier |
| `npm run test` | Tests unitarios con Vitest |
| `npm run test:watch` | Tests en modo watch |
| `npm run db:migrate` | Aplicar migraciones SQL a Supabase |
| `npm run db:seed` | Insertar categorías preset |
| `npm run types:gen` | Regenerar tipos de Supabase |

## Estructura

```
app/
  (auth)/          # Rutas públicas (login, callback)
  (app)/           # Rutas protegidas (requieren sesión)
    cards/         # Lista y detalle de tarjetas
    expenses/      # Consumos
    stats/         # Estadísticas
    settings/      # Configuración
components/
  ui/              # shadcn/ui
  cards/           # Componentes de tarjetas
  expenses/        # Componentes de consumos
  shared/          # Compartidos
  charts/          # Gráficos con Recharts
lib/
  supabase/        # Clients browser/server + types
  schemas/         # Zod schemas compartidos
  periods/         # Lógica de períodos (funciones puras)
  utils.ts         # Helpers generales
actions/           # Server Actions
migrations/        # SQL migrations versionadas
tests/             # Tests con Vitest
```

## Deploy a Vercel

1. Conectar el repo en [vercel.com](https://vercel.com)
2. Agregar variables de entorno en **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (ej: `https://mis-tarjetas.vercel.app`)
3. En Supabase **Authentication → URL Configuration** agregar la URL de Vercel a Redirect URLs
4. Deploy automático en cada push a `main`

## Progreso

- [x] Paso 1: Setup inicial — Next.js 16, Tailwind v4, shadcn/ui, ESLint, Prettier
- [x] Paso 2: Supabase schema + clients — migrations SQL, RLS, types TypeScript
- [x] Paso 3: Auth flow — login magic link, proxy auth guard, layout autenticado
- [x] Paso 4: Lógica de períodos — funciones puras + 36 tests Vitest
- [x] Paso 5: Schemas Zod + Server Actions — cards, expenses, categories, backup
- [x] Paso 6: UI básica — lista de tarjetas, formularios, bottom nav
- [x] Paso 7: Detalle de tarjeta — navegador de períodos, totales por período
- [x] Paso 8: CRUD consumos — formulario completo con cuotas, categorías, tags
- [x] Paso 9: Listado global de consumos con filtros
- [x] Paso 10: Settings — categorías custom, modo oscuro, export/import JSON
- [x] Paso 11: Dashboard — total del mes, próximo vencimiento, top categorías
- [x] Paso 12: Estadísticas — donut por categoría, tendencia mensual, top 5
- [x] Paso 13: PWA — manifest, service worker, instalable desde Safari iOS
- [ ] Paso 14: Deploy a Vercel (pendiente: configurar variables de entorno)
