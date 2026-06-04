# Project Structure

This is a full-stack Next.js App Router application. Next.js owns the UI routes and API route handlers, while the product code is organized by system boundary.

## Top-Level Layout

```text
emeraldcash_vms_next/
├── android/               # Capacitor Android project and native app assets
├── apps-script/           # Google Apps Script integration files
├── docs/                  # Durable project documentation and runbooks
├── ios/                   # Capacitor iOS project
├── public/                # Static files served directly by Next.js
├── scripts/               # Maintenance, deployment, and migration scripts
├── src/                   # Application source
├── tests/                 # Automated tests and test helpers
├── capacitor.config.ts    # Capacitor app configuration
├── next.config.ts         # Next.js configuration
├── package.json           # Scripts and dependencies
└── tsconfig.json          # TypeScript configuration
```

## Source Layout

```text
src/
├── app/                   # Next.js routes, layouts, API route wrappers, metadata
├── lib/                   # Infrastructure: auth, database, logging, API helpers, storage
├── shared/                # System-neutral UI, hooks, layouts, types, and utilities
├── styles/                # Global CSS
└── systems/               # Product modules: auth, lms, sms, vms
```

## System Boundaries

Each product system owns its feature code under `src/systems/<system>`.

```text
src/systems/
├── auth/                  # Authentication routes and login screen
├── lms/                   # Learning management system
├── sms/                   # Stock / asset management system
└── vms/                   # Vehicle valuation / inventory system
```

Inside a system, use this structure where it applies:

```text
api/                       # Route handlers, repositories, external API adapters
components/                # UI owned by this system
hooks/                     # React hooks owned by this system
services/                  # Business workflows and data operations
types/                     # System-specific TypeScript types and schemas
utils/                     # Small pure helpers
views/                     # Next.js page-level route implementations
```

`src/app` should stay thin. App routes should import from `src/systems/*/views` or `src/systems/*/api/routes` instead of containing large business logic directly.

## Shared Code Rules

Use `src/shared` only for code that can serve more than one system without depending on a specific product module.

Good shared code:

- App shell, navigation primitives, common modals, generic form controls.
- Language/context hooks and global UI state.
- Cross-system types such as roles and permissions.
- Generic utilities such as formatting, dates, class names, file helpers.

Avoid in `src/shared`:

- Imports from `src/systems/vms`, `src/systems/lms`, or `src/systems/sms`.
- Business rules for one specific system.
- Large page-level components.

When shared UI needs system data, pass data and callbacks as props. If the component imports one system directly, it probably belongs inside that system.

## Backend Flow

```text
Request
  -> src/proxy.ts for auth/origin/rate-limit checks
  -> src/app/api/**/route.ts wrapper
  -> src/systems/<system>/api/routes/**
  -> src/systems/<system>/services/**
  -> src/lib database/cache/storage helpers
```

Keep route handlers small. Validation, permissions, audit logging, and database workflows should live in service or helper modules where they can be tested and reused.

## Frontend Flow

```text
User
  -> src/app route
  -> src/shared/layouts/AppShell
  -> src/systems/<system>/views/**
  -> system components/hooks/utils
```

Page files should coordinate the screen. Complex forms, tables, media players, and dashboard widgets should be split into focused components and hooks.

## Public Assets

```text
public/
├── assets/brand-logos/    # Vehicle brand logo assets
├── downloads/             # User-downloadable APK files
├── icon-*.png             # PWA icons
├── apple-touch-icon*.png  # iOS home-screen icons
├── offline.html           # PWA offline fallback
└── sw.js                  # PWA service worker
```

Only keep assets in `public` when they must be addressable by URL. Imported component-only assets should live near the owning component or system.

## Scripts

Use `scripts/` for repeatable maintenance tasks only.

- `scripts/dev-reset.mjs` supports local development.
- `scripts/deploy/` contains deployment helpers.
- `scripts/migrations/` contains SQL migration artifacts.
- `scripts/backup-verification/` contains backup verification tooling.

One-off experiments and generated reports should stay ignored or move to an archive outside the release commit.

## Cleanliness Rules

Keep:

- Source under `src/app`, `src/lib`, `src/shared`, `src/systems`, and `src/styles`.
- Static assets referenced by code.
- Native app assets required by Capacitor.
- Durable docs and migration scripts.

Delete or ignore:

- `.next/`, `node_modules/`, build folders, log files, and `*.tsbuildinfo`.
- Local AI/tool logs such as `.codex/` and `.sixth/`.
- Temporary screenshots, previews, diagnostics, and one-off reports.

Before pushing, run:

```bash
npm run lint
npm run typecheck
npm run build
npm run audit:prod
```

For Android release checks, run:

```bash
cd android
./gradlew :app:assembleRelease
```
