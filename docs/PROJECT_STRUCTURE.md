# Project Structure

This is a Next.js App Router application. Keep framework-owned routes in `src/app`, shared code in top-level `src/*` folders, and operational artifacts out of the project root.

## Full Stack Map

The reference `frontend + backend + database` structure maps to this repo as a single full-stack Next.js application. Next.js owns both the React UI and the backend HTTP endpoints, so the stack is organized by responsibility instead of separate `frontend/` and `backend/` apps.

```text
emeraldcash_vms_next/
├── public/                # Static files served directly by Next.js
├── src/
│   ├── app/               # Frontend routes plus backend route handlers
│   │   ├── (app)/         # Authenticated app pages
│   │   ├── api/           # Backend API endpoints
│   │   ├── login/         # Public login page
│   │   └── components/    # Route-shared legacy components
│   ├── components/        # Shared reusable React UI
│   ├── features/          # Feature-owned UI modules
│   ├── services/          # Business logic and domain operations
│   ├── repositories/      # Data access abstractions
│   ├── lib/               # DB clients, cache, auth, helpers, schemas, hooks
│   ├── styles/            # Global/shared CSS
│   └── types/             # Shared TypeScript types
├── apps-script/           # Google Apps Script integrations
├── scripts/               # Maintenance, migrations, deploy helpers
├── docs/                  # Project documentation and work notes
└── tests/                 # Automated tests
```

### Frontend Layer

- `src/app/(app)/**/page.tsx` contains authenticated UI routes such as dashboard, vehicles, SMS, LMS, settings, and admin screens.
- `src/app/login/page.tsx`, `src/app/stock/page.tsx`, and `src/app/cleaned-vehicles/**` contain public or special-purpose routes.
- `src/components` contains shared UI such as navigation, optimized media/link helpers, reusable controls, and design-system primitives.
- `src/features/<feature>/components` is the preferred home for feature-specific client components as route-adjacent UI is cleaned up.
- `src/lib/use*.ts` and feature hooks support client data fetching, form state, optimistic UI, search, and UI behavior.

### Backend Layer

- `src/app/api/**/route.ts` contains Next.js Route Handlers for HTTP endpoints.
- Major API areas include `auth`, `vehicles`, `cleaned-vehicles`, `dashboard`, `sms`, `lms`, `stock`, `upload`, `cloudinary-signature`, `market-price`, and `cron`.
- `src/services` contains business logic such as vehicle operations, LMS logic, SMS workflows, user/staff operations, validation, and cache coordination.
- `src/repositories` contains reusable data access classes, especially the LMS repositories and the generic repository base.
- `middleware.ts` handles request-level routing/auth concerns before pages and route handlers run.
- `src/lib/api-error-wrapper.ts`, `src/lib/logger.ts`, and related helpers standardize API errors, request IDs, timeouts, and logs.

### Database And Storage Layer

- `src/lib/db-singleton.ts` manages the Neon PostgreSQL client, lazy connection setup, retry logic, health checks, and query execution.
- `src/lib/db.ts` re-exports the database manager and compatibility helpers used by services and APIs.
- `scripts/migrations` stores SQL migration artifacts.
- `src/lib/redis.ts` and `@vercel/kv` support cache reads, writes, and invalidation.
- `src/lib/cloudinary*.ts`, `src/app/api/upload`, and `src/app/api/cloudinary-signature` support image upload and media storage.
- `apps-script` and the README-documented Apps Script URLs support legacy or external Google Sheet/Drive workflows.

### Request Flow

```text
User
  -> Next.js page/layout in src/app
  -> Client hook or Server Component data request
  -> Route Handler in src/app/api
  -> Service in src/services
  -> Repository or db helper in src/repositories or src/lib/db*
  -> Neon PostgreSQL, Vercel KV, Cloudinary, or Apps Script
  -> JSON/data response
  -> React UI update
```

## Root

```text
.
├── docs/                  # Guides, analysis, TODOs, archived logs
├── public/                # Static files served by Next.js
├── scripts/               # Maintenance, deploy, database, and one-off scripts
├── src/                   # Application source
├── tests/                 # Automated tests
├── middleware.ts          # Next.js middleware
├── next.config.ts         # Next.js configuration
├── package.json           # Scripts and dependencies
└── tsconfig.json          # TypeScript configuration
```

## Source

```text
src/
├── app/                   # Next.js routes, layouts, loading/error boundaries, API routes
│   ├── (app)/             # Authenticated route group
│   ├── api/               # Route handlers
│   ├── login/             # Public login route
│   └── components/        # Legacy app shell and route-shared components
├── components/            # Shared reusable UI components
│   └── ui/                # Design-system primitives and variants
├── config/                # Runtime and framework-adjacent configuration helpers
├── lib/                   # Shared utilities, hooks, schemas, clients, and domain helpers
├── repositories/          # Data access layer
├── services/              # Business logic layer
├── styles/                # Global and shared CSS
└── types/                 # Global TypeScript declarations and cross-feature types
```

## Conventions

- `src/app` should mainly contain routes, layouts, loading states, error boundaries, and API route handlers.
- Reusable UI belongs in `src/components`; feature-specific UI should move toward `src/features/<feature>/components` as features are refactored.
- Server business logic belongs in `src/services`; database access belongs in `src/repositories` or focused `src/lib/db*` helpers.
- Global browser/server utilities belong in `src/lib`.
- Static assets that need direct URLs belong in `public`; imported UI assets belong near the component or feature that owns them.
- TODOs and work notes belong in `docs/todo`; old logs and generated summaries belong in `docs/archive`.
- Deploy scripts belong in `scripts/deploy`; database migrations belong in `scripts/migrations`.

Validate the project before larger cleanups:

```bash
npm run verify:ci
```

Use this guide for structure decisions while the CI suite covers linting, type safety, production builds, and dependency audit checks.
