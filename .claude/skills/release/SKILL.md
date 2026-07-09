---
name: release
description: >
  APOTEKH pre-deploy release gate. Runs the full go/no-go check before promoting
  backend (Railway), frontend, or website (Vercel) to production: builds, typecheck,
  hardening tests, npm audit, pending-migration check, forbidden-string scan
  (EFDMS/TRA/VFD/PharmaConnect in user-facing copy), env sanity, and optional live
  readiness probe. Produces a GO / NO-GO checklist. Activate with /release before
  any deploy, or when Elihaki asks "can we ship", "is this safe to deploy",
  "run the release gate", or "pre-deploy check".
---

# APOTEKH Release Gate

You are the release gatekeeper for APOTEKH. Your job: run every gate, report each
as PASS / FAIL / SKIPPED (with reason), and end with a single unambiguous verdict:
**GO** or **NO-GO**. A single FAIL on gates 1–7 means NO-GO — no exceptions, no
"probably fine". You never deploy anything yourself; you verify that a human can.

Authority: `docs/deployment-runbook.md` (release gates, env, rollback) and
`scripts/pre-deploy-check.ps1` (the local gate script). If this skill and the
runbook disagree, the runbook wins — and flag the disagreement.

---

## Activation

| Command | Behaviour |
|---------|-----------|
| `/release` | Full local gate (steps 1–7), report, verdict |
| `/release:live` | Full gate + live readiness probe against production URL (step 8) |
| `/release:quick` | Steps 2–4 only (build + typecheck + forbidden strings) — for mid-work sanity, never for an actual deploy decision |

---

## Procedure

Default production API URL (confirm with Elihaki if a different target is intended):
`https://pharmaconnect-production-e082.up.railway.app/api/v1`

### Step 1 — Working tree sanity
- `git status` — uncommitted changes? Deploying from a dirty tree is a NO-GO
  unless Elihaki explicitly says the uncommitted changes are the release.
- `git log -3 --oneline` — state what is being shipped in one line.

### Step 2 — The scripted gate
Run from repo root:
```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "https://pharmaconnect-production-e082.up.railway.app/api/v1"
```
- If it fails on Prisma DLL lock (dev server running on Windows), retry once with
  `-SkipPrismaGenerate` and say so in the report.
- This covers: Prisma generate, `npm audit --audit-level=high` (backend + frontend),
  backend build, hardening tests (`predeployment-hardening.test.ts`, `cors.test.ts`),
  frontend typecheck, frontend production build with the real API URL, website build.
- Report each sub-step individually, not just "script passed".

### Step 3 — Pending migrations
- Compare `backend/prisma/migrations/` against the schema:
  `cd backend && npx prisma migrate status` (needs `DATABASE_URL` in `backend/.env`;
  if unavailable, mark SKIPPED and say the deploy must run `npm run db:migrate`).
- Any unapplied migration → call it out explicitly with its name and whether the
  runbook classifies it as additive. Destructive migrations are an automatic NO-GO
  without a confirmed database backup.

### Step 4 — Forbidden-string scan (user-facing copy only)
Grep `frontend/src` and `website/` for strings that must never reach users:
- `EFDMS`, `TRA `, `VFD`, `fiscal receipt` — EFDMS must be invisible in **retail**
  surfaces (code identifiers and comments are fine; rendered strings/JSX text are
  failures). Exception: **wholesale marketing** may reference TRA-compliant VAT
  invoicing (e.g. the Wholesale tier copy in `website/src/lib/data/pricing.ts`) —
  that is deliberate. TRA wording in any retail tier copy, retail UI, or
  onboarding = FAIL.
- `PharmaConnect` in rendered copy — platform name is APOTEKH
- `Patient Safety Suite`, `remote dashboard`, `e-commerce`, `online storefront`,
  `Attendance` — banned UI names per CLAUDE.md
- Placeholder contact details — `wa.me/255000000000` or similar dummy numbers in
  rendered copy = FAIL
- Any hardcoded `localhost` or `http://` API URL in production code paths
Judge each hit: rendered to a user = FAIL; internal identifier/comment = note only.

### Step 5 — Env sanity (presence, not values)
- `backend/.env.example` covers everything the runbook requires
  (`DATABASE_URL`, JWT secrets, `ALLOWED_ORIGINS`, `FRONTEND_URL`, Resend, Supabase).
- No `.env` file staged or committed (`git ls-files | grep -i "\.env$"` → must be empty).
- `ALLOWED_ORIGINS` guidance in the runbook still matches the deployed domains.

### Step 6 — Price & tier drift
Verify the three price sources agree: `SUBSCRIPTION_PRICE_TABLE` in
`backend/src/modules/subscription/subscription-payments.service.ts`,
`website/src/lib/data/pricing.ts`, and the paywall/SubscriptionPage UI.
Canonical: ADDO 15,000 / BASIC(`ESSENTIAL`) 39,000 / STANDARD 55,000 /
PREMIUM 75,000 / WHOLESALE 100,000; annual = 10×. `ADDO_PLUS` 45,000 is allowed
**only** in the backend table (legacy renewals) — ADDO_PLUS appearing on the
website, in the paywall's tier offers, or any new-customer surface → FAIL.
"ESSENTIAL" rendered as a tier name in UI copy → FAIL (display name is BASIC).

### Step 7 — E2E smoke (if runnable)
- `cd frontend && npm run test:e2e` if Playwright is set up locally; otherwise
  SKIPPED with instruction to smoke test on the green deployment per the runbook
  (login, dashboard, dispensing, stock receive, reports, website lead form).

### Step 8 — Live readiness (only `/release:live`)
```powershell
.\scripts\pre-deploy-check.ps1 -FrontendApiUrl "<url>" -BackendReadyUrl "<url>/ready"
```
`/api/v1/ready` must return `status: "ready"` and `checks.database: "ok"`.

---

## Report Format

```markdown
# Release Gate — [YYYY-MM-DD HH:mm]
**Shipping:** [branch @ short-sha — one-line summary]
**Target:** [production / staging URL]

| # | Gate | Result | Notes |
|---|------|--------|-------|
| 1 | Working tree | PASS | clean @ 7e7013f1 |
| 2a | Prisma generate | PASS | |
| 2b | npm audit (BE/FE) | PASS | 0 high/critical |
| 2c | Backend build | PASS | |
| 2d | Hardening tests | PASS | 2 files, all green |
| 2e | Frontend typecheck | PASS | |
| 2f | Frontend prod build | PASS | VITE_API_URL verified |
| 2g | Website build | PASS | |
| 3 | Migrations | PASS | none pending |
| 4 | Forbidden strings | FAIL | see below |
| 5 | Env sanity | PASS | |
| 6 | Price/tier drift | PASS | |
| 7 | E2E smoke | SKIPPED | no local Playwright browsers — smoke on green |

## Failures
- **[Gate 4]** `frontend/src/modules/settings/SubscriptionPage.tsx:88` renders
  "ESSENTIAL" as the tier label. Must display "BASIC".
  Fix: map enum→marketing name via the tier-label helper (≈15 min).

## Verdict: **NO-GO** — fix Gate 4, re-run /release:quick, then proceed.

## After GO (human steps, per runbook)
1. Deploy green (Railway backend → run `npm run db:migrate` if Step 3 flagged pending)
2. `/release:live` against green
3. Smoke: login, dispensing + safety review, stock receive, reports, lead form
4. Promote; watch logs 30 min; rollback triggers per runbook
```

---

## Do-nots

- Never deploy, promote, or trigger Railway/Vercel builds yourself — this skill
  verifies; the human ships.
- Never run `prisma migrate deploy`, `migrate reset`, seeds, or anything that
  writes to a database. `migrate status` (read-only) is the ceiling.
- Never mark the verdict GO with any FAIL on gates 1–6, or soften a FAIL into a
  "warning" to make the verdict pass.
- Never skip the forbidden-string scan because "nothing UI-facing changed" —
  it takes seconds and copy regressions arrive through merges.
- Never fix failures silently during the gate run. Report first; fixing is a
  separate task after Elihaki sees the verdict (exception: `/release:quick`
  used mid-work may be followed by fixes when he asks).
- Never print secret values. Presence checks only.
