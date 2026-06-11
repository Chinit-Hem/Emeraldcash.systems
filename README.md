# Emerald Cash Systems

Full-stack Emerald Cash operations system built with Next.js App Router, Neon PostgreSQL, optional Redis/KV caching, Cloudinary uploads, and Capacitor mobile shells.

## Systems

- `VMS` - vehicle inventory, valuation, stock, images, filters, and dashboard stats.
- `LMS` - staff learning courses, lessons, video player, progress, and completions.
- `SMS` - stock and asset management workflows.
- `Auth` - session login, roles, staff accounts, permissions, and profile uploads.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Neon PostgreSQL
- Optional Vercel KV or Upstash Redis
- Cloudinary
- Vercel Analytics and Speed Insights
- Capacitor for Android and iOS projects

## Project Structure

Project layout and folder rules are documented in [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

Important source folders:

```text
src/app        Next.js route wrappers, layouts, metadata, API route entries
src/lib        Auth, database, Redis, logging, Cloudinary, API helpers
src/shared     Shared layout, UI, hooks, contexts, and utilities
src/systems    Product modules: auth, lms, sms, vms
```

Keep `src/app` thin. Business logic should live under `src/systems/*` or `src/lib`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
copy .env.example .env.local
```

3. Fill `.env.local` with real local credentials. Do not commit `.env` or `.env.local`.

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required for normal app use:

```bash
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Required for first production user seeding when the production `users` table is empty:

```bash
INITIAL_ADMIN_PASSWORD=
```

Redis cache is optional. Configure one of these pairs:

```bash
KV_REST_API_URL=
KV_REST_API_TOKEN=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Cloudinary image uploads:

```bash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=vehicle_uploads
```

Optional security and deployment settings:

```bash
TRUSTED_ORIGINS=
ALLOWED_HOSTS=
CLOUDFLARE_ORIGIN_SECRET=
ENABLE_AUTH_DEBUG=false
ALLOW_HTTP_COOKIES=false
```

Turnstile login protection:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
REQUIRE_TURNSTILE=false
```

Legacy or optional Apps Script integrations may still be used by a few maintenance/image cleanup flows:

```bash
NEXT_PUBLIC_API_URL=
APPS_SCRIPT_URL=
APPS_SCRIPT_UPLOAD_TOKEN=
```

## Authentication

On a fresh non-production database, the app can seed local demo users:

- `admin / 1234`
- `staff / 1234`

Existing databases keep their current passwords. Production requires `INITIAL_ADMIN_PASSWORD` before the first admin user can be seeded.

## API Testing

Public endpoints:

```text
GET  /api/ping
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Most other API endpoints require a valid session cookie. In Postman, login first with `POST /api/auth/login`, keep the returned cookie, then call protected endpoints such as:

```text
GET /api/vehicles
GET /api/vehicles/stats
GET /api/dashboard/stats
GET /api/lms/categories
GET /api/lms/lessons?categoryId=1
GET /api/health
```

For LMS lessons, pass one of:

```text
id=<lessonId>
categoryId=<categoryId>
all=true
```

Example:

```text
GET /api/lms/lessons?categoryId=1
```

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run audit:prod
npm run redis:check
npm run db:check
```

Before pushing a release change, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Use `npm run audit:prod` before production release checks when dependency risk matters.

## Vercel Deployment

The project deploys from the `main` branch.

Set production environment variables in Vercel Project Settings:

- `DATABASE_URL`
- `SESSION_SECRET`
- `INITIAL_ADMIN_PASSWORD` if the production database has no users yet
- Cloudinary variables if image upload is enabled
- Redis/KV variables if cache should be active
- `NEXT_PUBLIC_APP_ORIGIN` and `NEXT_PUBLIC_APP_URL`

After changing environment variables, redeploy the latest deployment.

Speed Insights updates after deployment and real user traffic. It does not change instantly after a Git push.

## Mobile

Capacitor project folders are included:

```text
android/
ios/
capacitor.config.ts
```

Run web checks first, then platform-specific native checks when preparing mobile releases.

## Security Notes

- Never commit `.env`, `.env.local`, database URLs, API tokens, Cloudinary secrets, or session secrets.
- Rotate any credential that was pasted into chat, screenshots, logs, or committed history.
- Use a long random `SESSION_SECRET` in production.
- Keep Redis/KV optional. The app should still run without it, using local fallback behavior where implemented.

## Documentation

Useful docs:

- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Backup Strategy](docs/BACKUP_STRATEGY.md)
- [Enterprise Readiness](docs/ENTERPRISE_READINESS.md)
- [SMS Workflow Verification](docs/SMS_WORKFLOW_VERIFICATION.md)
