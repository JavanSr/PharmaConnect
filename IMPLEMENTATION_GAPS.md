# APOTEKH Implementation Gaps & Operational Checklist

This document tracks everything **not yet implemented** across infrastructure, payment, email, regulatory, and operational systems. It's your master checklist to stay on top of production readiness.

---

## 🚨 CRITICAL PATH (Blocks Production Go-Live)

### Email Infrastructure
- [ ] **Email provider setup** — Choose SendGrid, AWS SES, or Brevo
  - Current: No email service integrated
  - Needed for: Password resets, order confirmations, expiry alerts, weekly digest, trial expiry notifications
  - Action: Set `MAIL_PROVIDER` env var, add credentials to Railway secrets
  - Estimate: 4 hours (integration) + 2 hours (testing)

- [ ] **Email templates** — Transactional templates for all user journeys
  - [ ] Password reset (1-hour token, single-use)
  - [ ] Trial expiry warning (7 days before)
  - [ ] Trial expired (hard lock, subscribe prompt)
  - [ ] Order confirmation (buyer receives when order submitted)
  - [ ] Order dispatch notification (seller ships order)
  - [ ] Stock expiry alert (30/60/90 days)
  - [ ] Low stock alert (reorder level threshold)
  - [ ] Weekly digest (dashboard snapshot for OWNER)
  - [ ] Compliance alert (RED items)
  - Action: Create HTML templates, test rendering, add to `backend/src/templates/` or use email provider UI builder
  - Estimate: 16 hours

### Payment Gateway Integration
- [ ] **Selcom API** — Tanzania payment aggregator (M-Pesa, TigoPesa, Airtel Money, bank transfer)
  - Current: Placeholder in `PaymentMethod` enum; no Selcom integration
  - Scope: Phase 2 per CLAUDE.md (Phase 1 uses manual payment confirmation)
  - Needed for: Subscription auto-billing, wholesale on-account payments
  - Action: Register Selcom sandbox account, implement webhook handler, add to `backend/src/lib/selcom.ts`
  - Estimate: 24 hours (sandbox integration) + 8 hours (production hardening)

- [ ] **Payment reconciliation** — Match Selcom callbacks to pending invoices
  - Missing: Webhook handler for payment confirmation
  - Missing: Automatic subscription renewal trigger on successful payment
  - Estimate: 12 hours

### Domain & SSL
- [ ] **Production domain** — `apotekh.tz` or similar
  - Current: Using Vercel & Railway default domains
  - Action: 
    - [ ] Purchase domain (Namecheap, Google Domains)
    - [ ] Point DNS to Vercel (frontend) and Railway (backend API)
    - [ ] SSL certificates (auto via Vercel + Railway)
  - Estimate: 2 hours (manual) + 30 min propagation

- [ ] **Email domain** — Separate subdomain for mail (mail.apotekh.tz)
  - Needed for: SPF, DKIM, DMARC records
  - Action: Add DNS records for SendGrid/SES verification
  - Estimate: 1 hour

- [ ] **API domain** — api.apotekh.tz or keep Railway subdomain
  - Update `VITE_API_URL` in frontend .env and Vercel settings
  - Update `ALLOWED_ORIGINS` in backend Railway secrets
  - Estimate: 1 hour

---

## 🔧 INFRASTRUCTURE & DEVOPS

### Monitoring & Observability
- [ ] **Error tracking** — Sentry or Rollbar
  - Current: Console errors only; no production error tracking
  - Action: Add Sentry SDK to frontend and backend, configure sourcemaps
  - Estimate: 6 hours

- [ ] **Performance monitoring** — New Relic, DataDog, or Vercel Analytics
  - Current: None
  - Action: Add RUM (Real User Monitoring) to track page load, API response times
  - Estimate: 4 hours

- [ ] **Log aggregation** — Railway built-in logs, or use LogDNA/Papertrail
  - Current: Railway console logs only
  - Action: Set up log retention policy, alerts on ERROR level logs
  - Estimate: 2 hours

- [ ] **Uptime monitoring** — UptimeRobot, Pingdom, or Betterstack
  - Action: Monitor `/ready` and `/api/v1/ready` endpoints every 5 minutes
  - Alert on: API down > 1 min, frontend down > 1 min
  - Estimate: 1 hour

- [ ] **Database backups** — Automated daily backups with retention
  - Current: Railway provides snapshots; no custom retention policy
  - Action: Configure Railway backup schedule (daily, 7-day retention minimum)
  - Estimate: 1 hour

### CI/CD Pipeline
- [ ] **Automated testing in CI** — GitHub Actions or Railway CI
  - Current: Tests exist locally; no CI enforcement
  - Action: 
    - [ ] Add `.github/workflows/test.yml` to run `npm test` on every PR
    - [ ] Block merge if tests fail
    - [ ] Add lint check (eslint, prettier)
  - Estimate: 4 hours

- [ ] **Pre-deploy checks** — Automated validation before production push
  - Current: Manual `pre-deploy-check.ps1` script
  - Action: Integrate into CI/CD pipeline; auto-run on deployment
  - Estimate: 2 hours

- [ ] **Deployment notifications** — Slack/email alerts on deploy
  - Action: Add webhook to send deploy start/complete messages
  - Estimate: 2 hours

---

## 📱 REGULATORY & COMPLIANCE

### Tanzania Regulatory
- [ ] **EFDMS integration** — Electronic Fiscal Device Management System
  - Current: Silent background job exists; no actual EFDMS API integration
  - Status: Pending TMDA accreditation (not a tech problem)
  - Action: Wait for regulatory approval, then integrate EFDMS API endpoints
  - Note: Only BASIC tier and above; runs silently in background
  - Estimate: 16 hours (once TMDA approves)

- [ ] **TMDA Licence validation** — Check pharmacy TMDA registration
  - Current: Manual licence entry; no verification against TMDA registry
  - Action: Implement TMDA licence lookup API (if available) or manual verification workflow
  - Estimate: 8 hours

- [ ] **Controlled Substances Reporting** — TMDA controlled drug audit trail
  - Current: Controlled register exists for retail; wholesale variant missing
  - Action: Add wholesale controlled-substance dispatch logs
  - Estimate: 8 hours

- [ ] **Data residency** — Pharmacy data must stay in Tanzania
  - Current: Database on Railway/Supabase (location TBD)
  - Action: Confirm database region is `Africa` or `Tanzania` equivalent; document in compliance audit
  - Estimate: 1 hour (configuration)

### PDPC (Privacy) & Data Protection
- [ ] **Privacy Policy** — Tanzania PDPC-compliant privacy statement
  - Current: Not published
  - Action: Draft with legal review, publish on `apotekh.tz/privacy`
  - Estimate: 8 hours (legal review required)

- [ ] **Data Deletion Workflow** — PDPC right to be forgotten
  - Current: Not implemented
  - Action: Build admin-only endpoint to soft-delete user data (keep audit trail)
  - Estimate: 6 hours

- [ ] **Consent Tracking** — Explicit opt-in for email, analytics, SMS
  - Current: No explicit consent captured
  - Action: Add consent checkboxes to signup, store in database, respect preferences
  - Estimate: 4 hours

---

## 🏪 BUSINESS & OPERATIONS

### Subscription & Billing
- [ ] **Subscription lifecycle** — Trial → paid → renewal → churn
  - Current: Trial period enforced; no auto-renewal or payment integration
  - Action: Implement Selcom webhook → auto-renew on payment success
  - Estimate: 12 hours

- [ ] **Invoice generation** — Subscription invoices for OWNER
  - Current: VAT invoices exist for B2B orders; no subscription receipts
  - Action: Generate monthly subscription invoice, email to OWNER
  - Estimate: 6 hours

- [ ] **Dunning management** — Remind overdue customers to pay
  - Current: Trial lock exists; no payment reminder flow
  - Action: Email sequence on day 1, 3, 7 after trial ends
  - Estimate: 4 hours

- [ ] **Churn prediction & recovery** — Identify at-risk customers
  - Current: None
  - Action: Flag pharmacies with declining activity; offer discount or support
  - Estimate: 8 hours (analytics + outreach automation)

### Knowledge Hub & Content
- [ ] **Content library seeding** — TMDA updates, clinical articles, CPD courses
  - Current: Schema exists; no content published
  - Action: Seed 50–100 articles with clinical content team
  - Estimate: 40 hours (content creation, review, publishing)

- [ ] **CPD accreditation** — Pharmacy Council MOU (Phase 2)
  - Current: CPD tracker built; not PC-accredited yet
  - Status: Blocked on Pharmacy Council MOU — not a tech problem
  - Action: Legal/business to sign MOU; then enable CPD in UI
  - Estimate: 4 hours (once MOU signed)

### Support & Documentation
- [ ] **User manual** — Comprehensive PDF/web guide
  - Current: Outdated user-manual.docx in repo
  - Action: Rebuild as interactive web docs (Docs site), screenshots, video walkthroughs
  - Estimate: 60 hours (content + video production)

- [ ] **API documentation** — OpenAPI/Swagger spec
  - Current: Partial Postman collection; no formal spec
  - Action: Generate Swagger from code, publish on api.apotekh.tz/docs
  - Estimate: 12 hours

- [ ] **Helpdesk/support system** — Ticketing for pharmacies
  - Current: None
  - Action: Implement Zendesk integration or custom support module
  - Estimate: 20 hours

---

## 🔐 SECURITY & HARDENING

### Secrets Management
- [ ] **Environment variables locked down** — No secrets in code
  - Current: .env.example exists; actual secrets in Railway/Vercel UI
  - Action: Audit all `process.env.*` calls; confirm secrets never logged
  - Estimate: 4 hours

- [ ] **API key rotation** — Selcom, SendGrid, Supabase keys rotated regularly
  - Current: Manual rotation only
  - Action: Implement key versioning, auto-rotate every 90 days
  - Estimate: 6 hours

### Authentication & Authorization
- [ ] **2FA (Two-Factor Authentication)** — TOTP or SMS backup
  - Current: JWT auth only; no 2FA
  - Status: Phase 2 (OWNER accounts should have 2FA)
  - Action: Implement TOTP via `speakeasy` or similar
  - Estimate: 12 hours

- [ ] **Session timeout policy** — Auto-logout after inactivity
  - Current: JWT refresh token valid 7 days; no inactivity timeout
  - Action: Track last activity timestamp, logout if > 30 min idle
  - Estimate: 4 hours

- [ ] **Audit logging** — All sensitive actions logged (login, password change, void, override)
  - Current: Partial (override_log exists); incomplete
  - Action: Expand audit log to cover auth, user mgmt, data exports
  - Estimate: 8 hours

### Data Security
- [ ] **PII encryption at rest** — Patient contact (email, phone) encrypted
  - Current: Stored in plaintext in database
  - Status: Low priority (no persistent patient data, session-based only)
  - Action: Add encryption for contact fields if patient records ever persist
  - Estimate: 10 hours

- [ ] **HTTPS enforcement** — Redirect HTTP → HTTPS
  - Current: Should be automatic on Vercel/Railway
  - Action: Verify HSTS header set, test mixed-content warnings
  - Estimate: 1 hour (testing only)

- [ ] **SQL injection protection** — Prisma ORM handles this; verify no raw queries
  - Current: Prisma used throughout; audit for dangerous patterns
  - Action: Grep for `$queryRaw`, `$executeRaw` — should not exist outside admin panel
  - Estimate: 2 hours (audit)

---

## 📊 ANALYTICS & INSIGHTS

### Product Analytics
- [ ] **Feature usage tracking** — Which features are actually used
  - Current: None
  - Action: Add Mixpanel or Plausible events to key flows (dispensing, stock receive, order submit)
  - Estimate: 16 hours

- [ ] **User cohort analysis** — Track retention, churn, feature adoption by tier
  - Current: None
  - Action: Set up analytics dashboard (Metabase, Superset, or DataStudio)
  - Estimate: 12 hours

- [ ] **Onboarding funnel** — Track signup → first dispense → active
  - Current: No instrumentation
  - Action: Add event tracking to identify drop-off points
  - Estimate: 6 hours

### Business Intelligence
- [ ] **Founder/SUPER_ADMIN dashboard** — Network-wide metrics
  - Current: Placeholder in codebase; not functional
  - Action: Query aggregated data (total dispensed, total revenue, top pharmacies, retention)
  - Estimate: 20 hours

- [ ] **Revenue recognition** — Track MRR, ARR, churn, LTV
  - Current: Subscription data exists; no aggregation
  - Action: Build SQL queries or BI dashboard
  - Estimate: 8 hours

---

## 🌍 LOCALIZATION & INTERNATIONALIZATION

### Languages
- [ ] **Swahili UI translation** — App should support Swahili (Kiswahili)
  - Current: English only
  - Action: Set up i18n (react-i18next), translate core flows
  - Estimate: 24 hours (setup + translation)

- [ ] **Swahili patient safety content** — Safety alerts in local language
  - Current: Clinical Decision Support in English
  - Action: Translate drug interaction, contraindication, NCD hints
  - Estimate: 16 hours (clinical review + translation)

### Regional
- [ ] **Tanzania-specific pharmacy regulations** — Content & UI reflecting TMDA, PC, TRA rules
  - Current: Partial (EFDMS, controlled register referenced)
  - Action: Audit all regulatory messaging; confirm accuracy with legal
  - Estimate: 8 hours

---

## 📦 VENDOR INTEGRATIONS (Phase 2+)

### Payment Providers
- [ ] **M-Pesa integration via Selcom** (High priority for Phase 2)
  - Current: Placeholder
  - Estimate: 24 hours

- [ ] **Flutterwave** (Alternative gateway, lower priority)
  - Estimate: 16 hours

### SMS Notifications
- [ ] **Twilio or Africastalking SMS** — Order confirmations, stock alerts via SMS
  - Current: Email only
  - Estimate: 12 hours

### Accounting Software
- [ ] **Sage/QuickBooks integration** — Sync invoices to accounting system
  - Current: None
  - Status: Phase 2+
  - Estimate: 20 hours

---

## ⚠️ KNOWN ISSUES & TECH DEBT

### Frontend
- [ ] **Missing error boundaries** — Some routes may crash without graceful fallback
  - Audit: Check all lazy-loaded pages have error handling
  - Estimate: 4 hours

- [ ] **Service Worker offline sync edge cases** — Handle 7-day queue expiry messaging better
  - Estimate: 4 hours

- [ ] **Accessibility (a11y)** — Keyboard nav, screen reader support
  - Current: Material Design 3 components support a11y, but not fully tested
  - Estimate: 12 hours (audit + fixes)

### Backend
- [ ] **Rate limiting** — Current: Basic rate limiter on auth; should cover all endpoints
  - Estimate: 4 hours

- [ ] **API versioning** — Currently `/api/v1`; plan for `/v2` if breaking changes needed
  - Estimate: 2 hours (documentation)

- [ ] **Database query optimization** — Audit N+1 queries, add indices where missing
  - Estimate: 8 hours (profiling + optimization)

---

## 🚀 DEPLOYMENT READINESS CHECKLIST

### Pre-Production
- [ ] Database backups tested (restore from backup)
- [ ] Secrets rotated & no hardcoded values in code
- [ ] All env vars documented in `.env.example`
- [ ] Pre-deploy checks passing (tests, lint, type check)
- [ ] Monitoring alerts configured (error rates, API latency, downtime)
- [ ] Runbook written for common issues (DB down, API down, payment gateway down)
- [ ] On-call rotation assigned
- [ ] Incident communication plan (Slack, email, SMS to customers)

### Post-Launch (Week 1)
- [ ] Monitor error rates (target < 0.1% of requests)
- [ ] Monitor API latency (p95 < 500ms)
- [ ] Monitor database connections (no exhaustion)
- [ ] Check user feedback channels (support email, in-app feedback)
- [ ] Verify all email flows working (trial expiry, order confirmation, etc.)
- [ ] Verify Selcom/payment webhooks firing correctly

---

## 📋 SUMMARY TABLE

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| **Email** | Templates | Provider setup | — | — |
| **Payment** | Selcom API | — | Reconciliation | Flutterwave |
| **Domain** | Production domain | API domain | — | — |
| **Regulatory** | EFDMS (awaiting approval) | TMDA validation | Controlled reporting | Licence management |
| **Billing** | Subscription lifecycle | Invoice generation | Dunning | Churn recovery |
| **Security** | Secrets mgmt | Audit logging | 2FA | PII encryption |
| **Analytics** | Feature tracking | Founder dashboard | Cohort analysis | LTV forecasting |
| **Documentation** | API docs | User manual | — | Video guides |

---

**Total estimated hours to full production readiness: ~350–400 hours (8–10 weeks at 40h/week)**

**Critical path (must-do before go-live): ~100 hours (2–3 weeks)**
- Email infrastructure + templates
- Selcom API integration
- Production domain setup
- Monitoring & error tracking
- Database backups
- Audit logging

**Next steps:** Pick 3–5 from the critical path; assign owners; track weekly.
