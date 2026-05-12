# CODEX.md — PharmaConnect

> **For AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.)**
> Read this before generating any code. It contains the non-negotiable product decisions,
> current build state, and what to build next. Violations of the constraints here produce
> code that will be rejected regardless of technical quality.
>
> For product direction, phase scope, and architecture rules, see `CLAUDE.md`.
> For safe editing behaviour and execution workflow, see `AGENTS.md`.

---

## Core Constraints — Absolute

These constraints override any other design consideration.

### OFFLINE-FIRST

Every core function must work with zero internet connectivity. Data syncs to the server when
a connection is detected. There is no "offline mode" — offline IS the default mode.

```
// Pattern: write to local DB first, queue sync event, resolve sync when online
// Never: write to remote API, then update local state
// Never: show "no connection" error for core features
```

### EFDMS RUNS SILENTLY — NO UI EXPOSURE

EFDMS/VFD compliance is built into every transaction. It must never surface in the UI.
No labels, badges, icons, status messages, notifications, or receipt numbers that reference
TRA, EFDMS, VFD, or fiscal receipts — including after a successful sale.

```
// Wrong: <Badge>EFDMS Compliant</Badge>
// Wrong: toast("TRA receipt generated")
// Wrong: <p>Receipt number: {receiptNo}</p>
// Right: efdmsModule.recordTransaction(txn) — called internally, no UI feedback
```

### NO PERSISTENT PATIENT DATA

Patient safety features are session-based only. No patient table, no patient UUID, no
persistent patient records of any kind.

```
// Wrong: await db.patient.create({ data: { uuid, allergyFlags } })
// Wrong: const patient = await db.patient.findUnique({ where: { id } })
// Right: const sessionFlags = { pregnancy: true, renalImpairment: false }
//        — flags live only in the active dispensing session
```

Persistent patient data is Phase 3+ (requires PDPC registration + MOH MOU). If current code
has a patient table, flag it — do not auto-refactor.

### NHIF/UHI — PLACEHOLDER ONLY

No NHIF claim submission, UHI integration, or insurance-related business logic. Render a
"coming soon" placeholder page only. Do not build the underlying data model or API routes.

### PIN OVERRIDE LOGGING — NON-NEGOTIABLE

Drug interaction overrides for MAJOR and CONTRAINDICATED severity must log:
timestamp, drug pair, severity level, overriding user ID, session ID. This log cannot be
deleted or edited by any user. The `override_log` table has a database-level trigger
preventing DELETE.

```typescript
interface InteractionOverrideLog {
  id: string;           // UUID
  timestamp: Date;      // server time, not device time
  drugA: string;        // drug name or code
  drugB: string;        // drug name or code
  severity: 'MAJOR' | 'CONTRAINDICATED';
  overriddenBy: string; // user ID of Pharmacist In-Charge
  sessionId: string;    // dispensing session ID
  reason?: string;      // optional — shown as text input in UI
}
```

### ENGLISH ONLY

No Swahili translations, locale toggles, or i18n infrastructure in the pharmacy app UI.
The marketing website (`/website/`) is separate — do not confuse the two.

---

## Subscription Tiers — Reference

| Tier | TZS/month | User Seats | Outlets |
|---|---|---|---|
| ADDO / DLDM | 20,000 | 3 | 1 |
| Essential | 35,000 | 4 | 1 |
| Standard | 55,000 | 7 | Up to 3 |
| Premium | 75,000 | 12 | Up to 5 |
| Wholesale | 100,000 | 10+ | 1 wholesale outlet |
| Enterprise | Custom | Unlimited | Unlimited |

Annual billing = 10x monthly (2 months free). Trial = 14 days, hard end date, no extensions.

Feature gates are enforced server-side, not just client-side.

### ADDO tier clinical feature boundary

ADDO gets contraindication alerts (8 patient flags) — and nothing else from the clinical
suite. The full drug interaction checker, dose calculator, and NCD usage hints are
Standard/Premium only.

```
// ADDO dispensing check — contraindication only
if (tier === 'ADDO') {
  checkContraindications(sessionFlags, drug);  // ✅ allowed
  checkDrugInteractions(drugs);                // ❌ block — Standard+ only
  runDoseCalculator(weight, drug);             // ❌ block — Standard+ only
}
```

---

## What's Built (Do Not Re-architect)

| Module | Status |
|---|---|
| Offline inventory: FEFO, expiry at 5 thresholds, barcode via camera, SMS alerts | ✅ Built |
| Drug interaction checker: 4 severity levels, PIN override for MAJOR/CONTRAINDICATED | ✅ Built |
| Contraindication alerts: 8 patient flags (Standard/Premium + ADDO alerts-only) | ✅ Built |
| Dose calculator: Clark's rule + weight-based (Standard/Premium only) | ✅ Built |
| NCD usage hints: 9 disease areas (Standard/Premium only) | ✅ Built |
| Diagnosis-drug matching | ✅ Built |
| EFDMS/VFD: silent background compliance on every transaction | ✅ Built |
| Owner revenue dashboard: real-time, remote access — all tiers | ✅ Built |
| B2B ordering: closed retail→wholesale network | ✅ Built (closed) |
| Knowledge Hub: TMDA bulletins, recalls, reference content | ✅ Built (content layer only) |
| Dispensing workflow: Full POS + records + void/reissue + discount (Standard/Premium/Wholesale); Basic POS for ADDO | ✅ Built |
| Subscription tiers with feature gating | ✅ Built |
| 14-day trial mechanic: hard end date | ✅ Built |

---

## Build Queue — Ordered by Priority

### P1 — Trial Onboarding Flow

A new pharmacy owner must complete full setup in under 30 minutes.

Required screens:
1. Pharmacy profile setup (name, tier, owner contact, location)
2. Staff user creation with role assignment
3. Stock import: CSV upload OR manual entry with barcode scanning
4. Pricing configuration per stock item
5. Setup completion confirmation + first-login checklist

Constraints:
- Must work offline from step 1
- No EFDMS/TRA messaging at any point

---

### P2 — Premium Tier Dashboard Features

All four must be complete before Premium tier is actively sold at TZS 75,000/month.

**2a. Predictive low-stock (7–14 day forecast)**
```
Logic:
- Calculate average daily sales velocity per product (rolling 30-day window)
- Flag products where: (current_stock / avg_daily_velocity) < 14 days
- Alert threshold configurable: 7 days (critical) / 14 days (warning)
- Must work offline using local transaction history
```

**2b. Demand forecasting (top 50 products)**
```
Logic:
- Rank products by total units sold in trailing 90 days
- For top 50: show monthly sales trend + projected next-month demand
- Flag seasonal patterns where month-over-month variance > 25%
- Display as simple chart + reorder suggestion
```

**2c. Dead stock risk scoring**
```
Logic:
- Flag products where: last_sale_date > 30 days AND expiry_date < 90 days
- Risk score: days_since_last_sale × (1 / days_to_expiry)
- Display ranked list: highest risk at top, with expiry date and estimated write-off value
```

**2d. Peer benchmarking (opt-in, anonymized)**
```
Privacy rules:
- Opt-in only — pharmacy must explicitly enable in settings
- Data aggregated before comparison: never show raw data from another pharmacy
- Show: gross margin vs Arusha average (anonymized)
- Show: top-selling categories vs network average
- Never identify specific pharmacies in comparisons
- Requires 10+ opted-in pharmacies to activate (show placeholder until threshold)
```

---

### P3 — Internal Trial Management Dashboard (founder-only)

Not customer-facing. Access: founder login only. Not linked from customer navigation.

Required fields per trial pharmacy:
- Pharmacy name, tier, owner contact
- Trial start date, day count (auto-calculated), conversion deadline
- Feature usage: which modules accessed in last 7 days
- Conversion status: ACTIVE TRIAL / CONVERTED / CHURNED
- Notes field (founder's qualitative observations)
- Alert: highlight any trial pharmacy at day 25+ without conversion action

---

### P4 — [BLOCKED] CPD Credit Tracking

Do not build. The CPD credit-tracking sub-module lives inside Knowledge Hub and is
structurally ready to be activated, but cannot go live until a formal MOU is signed with
the Pharmacy Council of Tanzania. Without that agreement, credits issued carry no official
standing — which would actively mislead pharmacists about their compliance status.

- **What is live:** Knowledge Hub content (TMDA bulletins, recalls, reference articles)
- **What is blocked:** Credit tracking, CPD logs, progress bars, PDF CPD record export

Do not build or activate any of this until the founder confirms the Pharmacy Council
agreement is in place.

---

## Clinical Safety Module — Drug Data Requirements

The drug interaction checker requires a drug database. Confirm the current drug data source
with the founder before modifying. If drug data needs to be updated or expanded:

- Prioritise drugs on Tanzania's Essential Medicines List (EML)
- Prioritise drug classes with high interaction frequency: anticoagulants, antiepileptics,
  antibiotics (especially fluoroquinolones), antidiabetics, antihypertensives
- NCD usage hints cover 9 disease areas:
  diabetes, hypertension, epilepsy, asthma/COPD, HIV/ARV interactions, malaria, TB, anaemia, pregnancy
- Contraindication flags (8):
  pregnancy, breastfeeding, renal impairment, hepatic impairment, paediatric (<12 years),
  elderly (>65 years), allergy (penicillin, sulfa, aspirin), G6PD deficiency

Do not expand the drug interaction database beyond what can be maintained accurately.
Inaccurate interaction data is clinically worse than no interaction data.

---

## Data Architecture Principles

### Local-first storage

- All transactional data writes to local storage first
- Sync queue: every write event is added to a queue
- Sync worker: processes queue when online, handles conflicts
- Conflict resolution:
  - Transaction logs are append-only (no conflicts)
  - Inventory levels resolve to server state when online (server is source of truth)
  - Last-write-wins for inventory, merge for logs

### Privacy

- Pharmacy-level data: owned by that pharmacy, accessible only to their users and the
  founder's admin view
- Peer benchmarking: only aggregated, never row-level, only when opted in
- Drug interaction override logs: available to pharmacy owner and Pharmacist In-Charge,
  exportable as PDF
- No patient identifiable data stored — dispensing records reference session-only flags
  (pregnancy, renal impairment, etc.) but not patient names, IDs, or UUIDs

---

## Tech Decisions to Maintain

| Decision | Rationale |
|---|---|
| Offline-first (local DB + sync) | Tanzania connectivity reality. Non-negotiable. |
| Barcode scanning via phone camera | No external hardware dependency. Works on any Android phone. |
| SMS alerts for low-stock | Reliable in low-internet environments. Does not require app to be open. |
| EFDMS in background with no UI exposure | Legal shield is real, but never surface it to users. |
| Hard trial end date (no extensions) | Reveals genuine value seekers. Soft trials produce tolerators who never convert. |
| Session-based patient safety | PDPC and MOH compliance. Persistent patient data is Phase 3+. |

---

## Phase Boundaries — Do Not Cross

| Phase | Trigger | What unlocks |
|---|---|---|
| Phase 1 | Now → 50 paying pharmacies | Subscription revenue only. Closed B2B. Knowledge Hub content only. No CPD credit tracking. No NHIF. No open marketplace. |
| Phase 2 | 50 paying pharmacies | NHIF Claims. Open B2B marketplace. CPD sponsorship conversations. Academic MOU. Embedded lending MVP. |
| Phase 3 | 200+ paying pharmacies | Data licensing. Open API. AI clinical decision support. Patient-facing features. Dar es Salaam expansion. |

Building Phase 2 or 3 features in Phase 1 is a resource allocation failure. Bootstrap
capital is TZS 2.4M. Every build hour spent on Phase 3 features is an hour not spent
getting to 10 paying pharmacies.

---

*Last updated: April 2026 · Elihaki M. Y. Javan · PharmaConnect · Arusha, Tanzania*
