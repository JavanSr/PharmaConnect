# APOTEKH Deployment Runbook

This runbook is the production release rule for APOTEKH. It is designed for Vercel website/frontend, Railway backend, and Supabase/Postgres data.

## Release Gates

Do not promote a release unless all gates pass:

1. Backend builds successfully.
2. Frontend typecheck passes.
3. Frontend production build uses the deployed API URL ending in `/api/v1`.
4. Website build passes.
5. Pre-deployment hardening tests pass.
6. The deployed backend answers `/api/v1/health`.
7. The deployed backend answers `/api/v1/ready` with `status: "ready"` and `checks.database: "ok"`.

Run the local gate from the repo root:

```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1"
```

If the local backend dev server is running on Windows and Prisma cannot replace its generated DLL, stop the dev server or run the preflight with generated Prisma already current:

```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1" -SkipPrismaGenerate
```

After deployment, verify the live backend:

```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1" -BackendReadyUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1/ready"
```

## Required Production Environment

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET` or `JWT_PRIVATE_KEY`
- `JWT_REFRESH_SECRET` or `JWT_REFRESH_PRIVATE_KEY`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS` with only production domains
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Frontend:

- `VITE_API_URL`, using HTTPS and ending in `/api/v1`

Website:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_NOTIFY`

## Blue-Green Equivalent

The current repo cannot itself create Railway or Vercel production environments. The operational standard is still blue-green or equivalent:

1. Keep the current production deployment live as blue.
2. Deploy the new commit to a preview/staging deployment as green.
3. Run `/api/v1/health` and `/api/v1/ready` against green.
4. Smoke test login, dashboard, dispensing, stock receive, reports, and website lead forms against green.
5. Promote green only after the gates pass.
6. Keep blue untouched until green has been stable for at least 30 minutes.

## Rollback

Prefer code rollback first and database rollback last.

1. Re-promote or redeploy the last known-good Vercel deployment for website/frontend.
2. Re-promote or redeploy the last known-good Railway deployment for backend.
3. Re-run `/api/v1/health` and `/api/v1/ready`.
4. Confirm login, dispensing, stock receive, and reports.
5. Leave additive database migrations in place unless they are actively breaking production.

Recent migrations are additive:

- `20260514_120000_anonymous_safety_events` creates anonymous analytics storage. Old code can ignore this table.
- `20260514_130000_password_reset_tokens` adds nullable reset-token columns and a partial unique index. Old code can ignore these columns.

Emergency destructive rollback SQL should only be used after a database backup and only if the schema addition itself is confirmed to be breaking production:

```sql
DROP TABLE IF EXISTS "safety_events";
DROP INDEX IF EXISTS "users_password_reset_token_key";
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "password_reset_token",
  DROP COLUMN IF EXISTS "password_reset_expiry";
```

## Post-Deploy Watch

For the first 30 minutes after promotion:

- Watch Railway logs for 5xx errors, slow request logs, and readiness failures.
- Watch Vercel logs for website form errors.
- Test one real login.
- Test one stock receive search.
- Test one dispensing basket with a safety review.
- Confirm reports load, including safety impact reporting.

Rollback immediately if checkout/dispensing is broken, login is broken, `/api/v1/ready` fails, or error rate rises and does not settle within five minutes.
