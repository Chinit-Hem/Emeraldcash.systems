# Scripts

This folder is for repeatable maintenance work. Keep scripts here only when another developer or future operator can run them safely with a clear purpose.

## Keep

- `dev-reset.mjs` for local development reset.
- `test-neon-connection.mjs` for database connectivity checks.
- `backup-verification/` for backup verification tooling and runbooks.
- `deploy/` for deployment helpers.
- `migrations/` for SQL migration artifacts.

## Avoid

- One-off experiments.
- Temporary data repair scripts without a runbook.
- Generated reports or logs.
- Scripts that require hidden local files without documenting the required environment variables.

## Naming

Use action-oriented names:

- `check-*` for read-only diagnostics.
- `fix-*` for repair scripts.
- `migrate-*` for migration helpers.
- `test-*` for scripted verification.

Scripts that mutate data should print what they will change and require an explicit confirmation flag, such as `--confirm`, before making writes.
