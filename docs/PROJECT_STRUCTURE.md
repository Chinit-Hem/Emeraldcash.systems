# Project Structure

This is a Next.js App Router application. Keep framework-owned routes in `src/app`, shared code in top-level `src/*` folders, and operational artifacts out of the project root.

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

Run the structure guard before larger cleanups:

```bash
npm run structure:check
```

The guard is intentionally practical: it fails on root clutter and missing core folders, while warning about legacy app component locations that should be cleaned up gradually.
