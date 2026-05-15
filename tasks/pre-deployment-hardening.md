# Pre-Deployment Hardening

## Scope

Apply the `PRE DEPLOYMENT/README` checklist without rewriting existing MVP flows.

## Current Pass

- [x] Authorization: restrict `/uploads/*` to files owned by the authenticated user's pharmacy, with APOTEKH Office override for `SUPER_ADMIN`.
- [x] Password reset: add one-hour, single-use reset tokens; clear reset token and old refresh sessions after password change.
- [x] Input validation: expose reset routes through Zod request schemas and keep reset responses enumeration-safe.
- [x] CORS: keep localhost defaults outside production only; production defaults stay on the deployed APOTEKH frontend domain plus explicit env allowlist.
- [x] Rate limiting: existing global API and auth-specific rate limits remain in force.
- [x] Error handling: existing production handler keeps stack traces out of 500 responses.
- [x] Database performance: no broad index sweep; added targeted unique index for password reset token lookup.
- [x] Logging and monitoring: existing health endpoints and request timing logs remain in force.
- [x] Release readiness: add `/ready` and `/api/v1/ready` probes that verify database connectivity before a green deployment is promoted.
- [x] Rollback: add `docs/deployment-runbook.md` with blue-green/equivalent release gates, live readiness checks, and non-destructive rollback preference.
- [x] Preflight automation: add `scripts/pre-deploy-check.ps1` to run build/test gates and optional live readiness verification before promotion.

## Verification

- Backend predeployment hardening tests cover password reset token reuse/expiry clearing and uploaded prescription ownership checks.
- Backend readiness is covered by the predeployment hardening test suite.
- Frontend/website production build gates are encoded in `scripts/pre-deploy-check.ps1`.

## Out Of Scope For This Pass

- Provider-side alerting setup in Railway/Vercel/Supabase must still be configured in those dashboards.
- Actual Railway/Vercel traffic promotion is operational: use the runbook because the repo cannot flip provider traffic by itself.
- External uptime monitor configuration must still be created with the monitoring provider.
