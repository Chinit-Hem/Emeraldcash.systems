# Enterprise Readiness Checklist

This checklist defines the go-live gates for EmeraldCash VMS. Security,
performance, database reliability, monitoring, documentation, UAT, and CI/CD
must be verified before production launch.

## 1. Security Checklist

Security is required before going live.

### A. Authentication Security

- [ ] MFA / 2FA is available for privileged users.
- [ ] Strong password policy is enforced.
- [ ] Login and auth-sensitive endpoints are rate limited.
- [ ] Brute-force protection is enabled.
- [ ] Session expiry and logout behavior are tested.

### B. Authorization Security

- [ ] RBAC is implemented for all user types.
- [ ] Permission matrix is documented and approved.
- [ ] API-level permission checks are enforced on protected routes.
- [ ] Auth-sensitive API routes use `requirePermission()` or an equivalent
      server-side authorization guard.
- [ ] Role and permission changes are audited.

### C. API Security

- [ ] HTTPS-only production traffic is enforced.
- [ ] JWT/session expiration is configured.
- [ ] Input validation is present on write endpoints.
- [ ] SQL injection protection is verified by using parameterized queries or
      safe ORM/query helpers.
- [ ] CORS is restricted to approved production origins.
- [ ] Production dependency audit passes:

```bash
npm run audit:prod
```

- [ ] No secrets are committed:

```bash
rg -n "postgresql://[^\\s]+:[^\\s]+@|SECRET|API_SECRET|PRIVATE_KEY" --glob '!node_modules/**' --glob '!.next/**'
```

Operational note: a database credential was present in historical utility
scripts and docs. Rotate the Neon database password before relying on this repo
in production.

### D. Database Security

- [ ] Sensitive data is encrypted where required.
- [ ] Daily backups are enabled.
- [ ] PITR is enabled if using a paid Neon plan.
- [ ] Connection pooling is configured for production.
- [ ] Read-only database roles exist for reporting or support workflows.
- [ ] Production write access is limited to the application and approved
      operators.

### E. Cloudinary Security

- [ ] Signed URLs are used for protected delivery when required.
- [ ] Private images are enabled for sensitive assets if needed.
- [ ] Upload signing is enabled for client-side upload flows.
- [ ] Transformations are restricted to approved presets or signed
      transformations.

### F. Penetration Testing

- [ ] Blackbox testing is completed before launch.
- [ ] OWASP Top 10 scan is completed.
- [ ] Vulnerability scan is completed for application and dependencies.
- [ ] Critical and high findings are fixed or formally accepted before release.

## 2. Performance Checklist

Load testing must be completed before production launch.

### A. Load Testing

- [ ] 100 concurrent users.
- [ ] 500 concurrent users.
- [ ] 1,000 concurrent users.
- [ ] 5,000 concurrent users if this is an expected business target.

### B. Stress Testing

- [ ] API calls at 10,000/min are tested or capacity limits are documented.
- [ ] Database-heavy queries are tested.
- [ ] Image upload spikes are tested.
- [ ] Failure behavior is documented for rate limits, queue limits, and upload
      limits.

### C. Optimization

- [ ] Cache strategy is documented. Redis is optional, but repeated expensive
      reads should not hit the database unnecessarily.
- [ ] Slow queries are optimized.
- [ ] DB round trips are reduced for high-traffic screens.
- [ ] Cloudinary/CDN delivery is used for images.
- [ ] Production build passes:

```bash
npm run build
```

- [ ] Core routes are exercised after deployment: `/vehicles`, `/sms`, `/lms`,
      `/settings`.
- [ ] Vercel Speed Insights are reviewed after deployment.
- [ ] Slow API routes are checked in Vercel Runtime Logs, especially vehicle
      listing/search and LMS progress.

Targets:

- LCP under 2.5s on key pages.
- INP under 200ms.
- API list/search routes return in under 2s for normal filters.

## 3. Database Checklist: NeonDB

Database optimization is required for a large production system.

### A. Indexing

- [ ] Indexes are added for slow and high-traffic queries.
- [ ] Unused indexes are removed after review.
- [ ] Index changes are tracked in `scripts/migrations/` or a dedicated
      migration folder.

### B. Query Optimization

- [ ] Slow queries are reviewed before release.
- [ ] `EXPLAIN ANALYZE` is used for high-traffic endpoints.
- [ ] Vehicle list/search query plans are reviewed.
- [ ] SMS asset query plans are reviewed.
- [ ] LMS dashboard/progress query plans are reviewed.
- [ ] Ad hoc production writes from local scripts are avoided unless the script
      is documented and idempotent.

### C. Backup

- [ ] Daily backup is enabled.
- [ ] PITR is enabled if using a paid Neon plan.
- [ ] Backup verification passes:

```bash
npm run backup:verify
```

- [ ] If the backup table is missing, create it only after confirming the target
      database:

```powershell
$env:CONFIRM_CREATE_BACKUP_TABLE="true"; npm run backup:create
```

- [ ] `DATABASE_URL` is supplied by the runtime environment.
- [ ] Backup verification compares production tables with backup/archive
      tables.
- [ ] Restore procedures are documented in `docs/BACKUP_STRATEGY.md` and
      `scripts/backup-verification/RUNBOOK.md`.
- [ ] Restore drill is completed quarterly against a non-production
      branch/database.

### D. Monitoring

- [ ] CPU is monitored.
- [ ] RAM is monitored.
- [ ] Storage is monitored.
- [ ] Connection count is monitored.
- [ ] Slow query behavior is reviewed during and after load testing.

## 4. Cloudinary Checklist

### A. Image Optimization

- [ ] Auto quality is enabled where appropriate.
- [ ] Auto format is enabled where appropriate.
- [ ] Mobile-sized transformations are used for mobile views.
- [ ] Large original images are not delivered directly to routine list views.

### B. Bandwidth Monitoring

- [ ] Cloudinary dashboard is monitored for quota usage.
- [ ] Alerts or operational checks exist to avoid over-quota production impact.

### C. Security

- [ ] Signed uploads are used where required.
- [ ] Private assets are used for sensitive images if needed.
- [ ] Transformations are restricted as described in the security checklist.

## 5. Monitoring And Logging

Enterprise systems require 24/7 monitoring.

### Tools

- [ ] Vercel Analytics or equivalent is enabled.
- [ ] Vercel Speed Insights is enabled.
- [ ] Vercel Runtime Logs are enabled.
- [ ] NeonDB monitoring is reviewed.
- [ ] Cloudinary dashboard is reviewed.
- [ ] Logtail, Datadog, Grafana, or an equivalent log drain/error tracking tool
      is configured for production on Pro/Enterprise plans.

### Monitor

- [ ] API errors.
- [ ] Latency.
- [ ] DB slow queries.
- [ ] Image load time.
- [ ] User activity.
- [ ] Authentication failures.
- [ ] High-risk business actions.

Post-deploy log check:

```bash
vercel logs <deployment-url> --level error --since 1h
```

Logging baseline:

- [ ] API errors include structured context: route, action, actor when
      available, request id, and duration.
- [ ] Sensitive values are never logged.
- [ ] High-risk business actions write audit events through
      `src/lib/audit-log.ts`.

Current audit coverage:

- Vehicle create/update/delete through cleaned vehicle APIs.
- LMS lesson completion.

## 6. Documentation

System documentation must stay current for future developers and operators.

### A. API Documentation

- [ ] Endpoints are documented.
- [ ] Parameters are documented.
- [ ] Responses are documented.
- [ ] Error responses are documented.
- [ ] Authentication and permission requirements are documented per endpoint.

### B. System Architecture

- [ ] Architecture diagram is available.
- [ ] Data flow is documented.
- [ ] Security layers are documented.
- [ ] Deployment environments are documented.
- [ ] External services are documented: Vercel, NeonDB, Cloudinary, and logging.

### C. Admin Manual

- [ ] User management is documented.
- [ ] Role and permission management is documented.
- [ ] Vehicle data management is documented.
- [ ] SMS asset management is documented.
- [ ] LMS management is documented.
- [ ] Backup, restore, and incident steps are documented.

Keep these files current:

- `docs/ENTERPRISE_READINESS.md`
- `docs/BACKUP_STRATEGY.md`
- `docs/SMS_WORKFLOW_VERIFICATION.md`
- `docs/guides/LMS_TEST_DATA_GUIDE.md`
- `.env.example`

Any new production operation should include:

- Purpose.
- Required environment variables.
- Rollback steps.
- Verification command.

## 7. UAT Checklist

UAT is the final step before launch and must include real users.

### Test

- [ ] Login.
- [ ] Dashboard.
- [ ] CRUD operations.
- [ ] Upload images.
- [ ] Reports.
- [ ] Notifications.
- [ ] Vehicle create/edit/delete/search.
- [ ] SMS asset upload, transfer, accept/reject, return.
- [ ] LMS lesson watch progress and completion.
- [ ] Admin LMS categories/lessons/staff.
- [ ] Settings and role/permission changes.

Capture UAT evidence with:

- Tester.
- Date.
- Browser/device.
- Scenario.
- Result.
- Issue link if failed.

## 8. Deployment Checklist

Never deploy production directly from a local machine.

### CI/CD

- [ ] Auto deploy is configured.
- [ ] Auto rollback or manual rollback procedure is documented.
- [ ] Version control is the source of truth.
- [ ] Production deployment requires CI checks to pass.

Run before every merge:

```bash
npm run verify:ci
```

The CI workflow runs:

- Lint: `npm run lint`
- TypeScript: `npm run typecheck`
- Production build: `npm run build`
- Production dependency audit: `npm run audit:prod`

GitHub Actions files:

- `.github/workflows/node.js.yml`
- `.github/workflows/lint.yml`
- `.github/workflows/npm-publish-github-packages.yml`

### Environment

- [ ] Development environment exists.
- [ ] Staging environment exists.
- [ ] Production environment exists.
- [ ] Environment variables are separated by environment.
- [ ] Production secrets are stored only in the deployment platform or approved
      secret manager.

## Emerald Go-Live Summary

EmeraldCash VMS is production-ready only after these are completed:

- Security testing.
- Performance testing.
- Database optimization.
- Cloudinary optimization.
- Monitoring.
- Logging.
- Documentation.
- UAT.
- CI/CD pipeline.
