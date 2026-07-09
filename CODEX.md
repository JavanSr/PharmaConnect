# CODEX.md — APOTEKH (PharmaConnect repo)

> **For AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.)**
> Read this before generating any code. It contains the non-negotiable product decisions.
> Violations of the constraints here produce code that will be rejected regardless of
> technical quality.
>
> **Precedence:** `CLAUDE.md` is the source of truth for product direction, phase scope,
> pricing, and architecture. This file is the short, hard-constraint digest of it.
> If the two ever disagree, `CLAUDE.md` wins — and flag the disagreement.
> For safe editing behaviour and execution workflow, see `AGENTS.MD`.
>
> Last reconciled against CLAUDE.md and the live codebase: 2026-07-05.

---

## Core Constraints — Absolute

These constraints override any other design consideration.

### OFFLINE-FIRST

Every core function must work with degraded or no connectivity. Reads are served
from Service Worker cache (stale-while-revalidate for dashboards, network-first for
stock/dispensing); failed writes queue in IndexedDB (7-day TTL) and sync when the
server is reachable again.

```
// Pattern: fire the request (networkMode: 'offlineFirst'), let SW serve cache,
//          queue failed writes, replay on reconnect
// Never: show "no connection" error for core features
// Never queue: auth/*, dispensing/checkout, inventory/conflicts, health
//   — these must complete or fail immediately
```

### EFDMS RUNS SILENTLY — NO UI EXPOSURE

EFDMS/VFD compliance is built into every transaction (BASIC tier upward). It must
never surface in the UI. No labels, badges, icons, status messages, notifications,
or receipt wording that reference TRA, EFDMS, VFD, or fiscal receipts — including
after a successful sale. Owner can view it under "Compliance" after 60–90 days;
never in onboarding or sales conversations.

```
// Wrong: <Badge>EFDMS Compliant</Badge>
// Wrong: toast("TRA receipt generated")
// Right: efdmsModule.recordTransaction(txn) — called internally, no UI feedback
```

### NO PERSISTENT PATIENT DATA

Patient safety features are session-based only. No patient table, no patient UUID,
no persistent patient records of any kind. Persistent patient data is Phase 3+
(requires PDPC registration + MOH MOU). If you find patient tables in legacy DB
generations (see `docs/audits/AUDIT-2026-04-13.md`), flag them — do not
auto-refactor, do not write to them.

```
// Wrong: await db.patient.create({ data: { uuid, allergyFlags } })
// Right: const sessionFlags = { pregnancy: true, renalImpairment: false }
//        — flags live only in the active dispensing session
```

### CLINICAL DECISION SUPPORT IS NEVER TIER-GATED

The full clinical suite — drug interaction checker (4 severity levels), dose
calculator, contraindication alerts (8 flags), NCD hints, diagnosis-drug matching,
therapeutic equivalence, override logging — is identical across ADDO, BASIC,
STANDARD, and PREMIUM. Do not gate any clinical safety feature behind a tier.
(WHOLESALE is a separate product with no clinical suite at all.)

### OVERRIDE MODEL — ACKNOWLEDGE, PROCEED, LOG. NO PIN GATE.

When a drug interaction, contraindication, or AWaRe RESERVE alert fires, the
dispenser sees a clear warning and may acknowledge and proceed. **Do NOT implement
a PIC/Superintendent PIN escalation gate for any alert severity level.** The warning
is the protection; the log is the accountability.

Every override is logged immutably: timestamp (server time), drug pair, severity,
overriding user ID, session ID, optional reason. The `override_log` table has a
database-level trigger preventing DELETE — from any role, including superadmin.
This is a permanent medical record. Never weaken or remove that trigger.

### NHIF/UHI — PLACEHOLDER ONLY

No NHIF claim submission, UHI integration, or insurance business logic. Render the
`DeferredFeaturePage` placeholder only. Blocked on NHIF reimbursement reform, not
on tech. Legacy `nhif_claims` tables in old DB generations are dead — do not build
on them.

### PAYMENTS GO THROUGH AZAMPAY — DON'T ADD A SECOND GATEWAY

Subscription billing is self-service via AzamPay MNO STK push
(`backend/src/modules/azampay/` + `settings/subscription/checkout`), with
automatic activation on the AzamPay callback. The admin manual-payments endpoint
is the founder-side fallback (bank transfers, edge cases) — the paywall's manual
submission form was deliberately removed.

```
// Right: POST /settings/subscription/checkout → STK push → callback activates
// Wrong: reintroducing a manual payment form in the paywall
// Wrong: adding Flutterwave/Stripe/DPO alongside AzamPay without instruction
// Wrong: activating a subscription outside activateSubscriptionFromPayment
```

### LANGUAGE — ENGLISH FIRST, THIN SWAHILI LAYER

The app has a deliberately thin i18next layer (`frontend/src/i18n/`, `en.json` +
`sw.json`: nav, common actions, key labels, errors — with a TopBar toggle).
English is default and fallback. Do not mass-translate the app or expand
`sw.json` beyond high-traffic strings without founder instruction. The marketing
website (`/website/`) is English.

---

## Subscription Tiers — Reference (fixed; do not change without explicit instruction)

| Marketing name | Prisma enum | Tsh/month | Users | Outlets | Trial |
|---|---|---|---|---|---|
| ADDO | `ADDO` | 15,000 | 3 | 1 | 14 days |
| BASIC | `ESSENTIAL` | 39,000 | 5 | 2 | 14 days |
| STANDARD | `STANDARD` | 55,000 | 10 | 3 | 14 days |
| PREMIUM | `PREMIUM` | 75,000 | 20 | 5 | 14 days |
| WHOLESALE | `WHOLESALE` | 100,000 | 10 + delivery staff | 1 wholesale outlet | — |
| ENTERPRISE | `ENTERPRISE` | Negotiated | Unlimited | 6+ | — |

- Annual billing = 10× monthly (2 months free).
- In UI copy the 39,000 tier is always **BASIC**, never "ESSENTIAL". `ADDO_PLUS`
  and `FREE` are legacy enum values only — never sell or surface them.
- Trial is 14 days with a hard end date and grace-mode enforcement (see
  `trial.ts` middleware in CLAUDE.md). Only the founder (SUPER_ADMIN) may extend
  an expiry, via `PATCH /admin/pharmacies/:id/expiry`. Never build self-serve
  trial extensions.
- Feature gates are enforced server-side (`tier.ts` → `TIER_INSUFFICIENT`), not
  just client-side.

---

## What's Built (Do Not Re-architect)

See CLAUDE.md "Module architecture" and "Architecture overview" for the full,
current list. Highlights that assistants keep trying to rebuild — don't:

| Module | Status |
|---|---|
| Offline inventory: FEFO, expiry urgency ladder, barcode via camera, alerts | ✅ Built |
| Clinical suite: interactions, contraindications, dose calc, NCD hints — all tiers | ✅ Built |
| Override logging: immutable `override_log` with DB delete-prevention trigger | ✅ Built (verified live) |
| EFDMS/VFD: silent background compliance + retry job | ✅ Built |
| Owner dashboard, analytics, reports (CSV/PDF) | ✅ Built |
| Forecasting: stockout risk, dead stock, seasonality (PREMIUM) | ✅ Built |
| Peer benchmarking endpoint (`/reports/benchmarking/peer`) | ✅ Built |
| B2B ordering: closed retail→wholesale network + Tier 2 supplier portal | ✅ Built (closed) |
| AzamPay self-service checkout: STK push, callback auto-activation | ✅ Built |
| Subscription tiers, trial + grace enforcement, admin manual-payment fallback | ✅ Built |
| Swahili language toggle (thin i18next layer) | ✅ Built |
| SUPER_ADMIN shell: pharmacy management, impersonation, feature flags, audit log | ✅ Built |

If a task file asks for something in this table, the correct move is to extend the
existing module — not to write a parallel one.

---

## Blocked — Do Not Build

| Item | Why | Unblocks when |
|---|---|---|
| CPD credit tracking (logs, points, progress bars, PDF export) | Credits carry no official standing without a Pharmacy Council MOU — would mislead pharmacists | Founder confirms PC MOU signed |
| NHIF claims | Deferred pending NHIF Breeze API accreditation; `modules/nhif/` is a placeholder only | NHIF accreditation + reimbursement reform |
| A second payment gateway (Flutterwave, Stripe, DPO…) | AzamPay is live and sufficient | Explicit founder instruction |
| Open B2B marketplace | Legal restriction + phase gating | Phase 2 (50 paying pharmacies) |
| Persistent patient records | PDPC + MOH requirements | Phase 3+ |

---

## Clinical Safety Module — Drug Data Requirements

Confirm the current drug data source with the founder before modifying. If drug
data needs updating or expanding:

- Prioritise drugs on Tanzania's Essential Medicines List (EML)
- Prioritise high-interaction classes: anticoagulants, antiepileptics, antibiotics
  (especially fluoroquinolones), antidiabetics, antihypertensives
- NCD usage hints cover 9 disease areas: diabetes, hypertension, epilepsy,
  asthma/COPD, HIV/ARV interactions, malaria, TB, anaemia, pregnancy
- Contraindication flags (8): pregnancy, breastfeeding, renal impairment, hepatic
  impairment, paediatric (<12), elderly (>65), allergy (penicillin, sulfa,
  aspirin), G6PD deficiency
- All new catalogue/safety data goes through the Review Queue
  (`PENDING_REVIEW` → platform pharmacist approval) — never straight to live.

Do not expand the interaction database beyond what can be maintained accurately.
Inaccurate interaction data is clinically worse than no interaction data.

---

## Data Architecture Principles

- **Local-first storage:** transactional writes hit local storage first; sync queue
  replays when online. Transaction logs are append-only (no conflicts); inventory
  levels resolve to server state (server is source of truth); last-write-wins for
  inventory, merge for logs.
- **Privacy:** pharmacy-level data is owned by that pharmacy (their users + founder
  admin view only). Peer benchmarking is opt-in, aggregated, never row-level, and
  never identifies another pharmacy. Safety-impact analytics are anonymous
  operational signals only — no patient-identifying data, ever.
- **Override logs:** visible to pharmacy OWNER and PHARMACIST_IN_CHARGE,
  exportable as PDF, never deletable.

---

## Tech Decisions to Maintain

| Decision | Rationale |
|---|---|
| Offline-first (SW cache + IndexedDB queue + sync) | Tanzania connectivity reality. Non-negotiable. |
| Barcode scanning via phone camera | No external hardware. Works on any Android phone. |
| SMS/WhatsApp alerts for critical events | Reliable in low-internet environments. |
| EFDMS in background, zero UI exposure | Legal shield is real; never surface it to users. |
| Hard trial end (founder-only extensions) | Reveals genuine value seekers; soft trials produce tolerators. |
| Session-based patient safety | PDPC and MOH compliance. Persistent data is Phase 3+. |
| AzamPay as the single payment rail | One gateway, one activation path, one callback to secure. |
| English-first with a thin Swahili layer | High-traffic labels translated; full translation deferred. |

---

## Phase Boundaries — Do Not Cross

| Phase | Trigger | What unlocks |
|---|---|---|
| Phase 1 | Now → 50 paying pharmacies | Subscription revenue via AzamPay self-service. Closed B2B (wholesale openly marketed). Knowledge Hub content. No CPD credits. No NHIF. No open marketplace. |
| Phase 2 | 50 paying pharmacies | NHIF claims (if accredited + reformed). Open B2B marketplace. CPD sponsorship conversations. Stock Exchange. Tier 3 wholesaler ERP/API. |
| Phase 3 | 200+ paying pharmacies | Data licensing. Open API. Patient-facing features. Persistent patient records (with PDPC/MOH). Dar es Salaam expansion. |

Building Phase 2 or 3 features in Phase 1 is a resource allocation failure. Every
build hour spent ahead of the phase gate is an hour not spent getting to the next
paying pharmacy.

---

*Maintained by Elihaki M. Y. Javan · APOTEKH · Dodoma, Tanzania · Reconcile this
file against CLAUDE.md whenever pricing, tiers, or phase gates change.*
