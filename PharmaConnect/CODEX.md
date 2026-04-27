# CODEX.md — PharmaConnect

> **For AI coding assistants (OpenAI Codex, GitHub Copilot, Cursor, etc.)**
> Read this before generating any code. It contains the non-negotiable product decisions, current build state, and what to build next. Violations of the constraints here produce code that will be rejected regardless of technical quality.

---

## Product Summary

PharmaConnect is a **multi-tier pharmacy operating system for Tanzania**. It is not a generic inventory tool. It is not a Western pharmacy system adapted for Africa. It is built specifically for:

- Tanzania's regulatory environment (TMDA, EFDMS/VFD, Pharmacy Council CPD)
- Tanzania's connectivity reality (offline-first, sync-when-connected)
- Tanzania's pharmacy economics (15,600 outlets, majority paper-based, NHIF is a financial threat not a benefit)
- Tanzania's language (Swahili-first user interfaces)

**Strategic model:** Embed as pharmacy OS first. Layer CPD education, B2B marketplace, and data monetization second. Revenue comes from pharma companies and data consumers — not from overcharging pharmacy owners.

---

## Core Constraints — Absolute

These constraints override any other design consideration. Code that violates them is not acceptable.

### OFFLINE-FIRST
Every core function must work with zero internet connectivity. Data syncs to the server when a connection is detected. There is no "offline mode" — offline IS the default mode.

```
// Pattern: write to local DB first, queue sync event, resolve sync when online
// Never: write to remote API, then update local state
// Never: show "no connection" error for core features
```

### EFDMS RUNS SILENTLY — NO UI EXPOSURE
EFDMS/VFD compliance (Tanzania Revenue Authority fiscal receipts) is built into every transaction. It must never surface in the UI. No labels, badges, icons, status messages, or notifications that reference TRA, EFDMS, VFD, or fiscal receipts.

```
// Wrong: <Badge>EFDMS Compliant</Badge>
// Wrong: toast("TRA receipt generated")
// Right: efdmsModule.recordTransaction(txn) — called internally, no UI feedback
```

### NHIF/UHI — DO NOT BUILD
No NHIF claim submission, UHI integration, or insurance-related features. Deprioritized indefinitely. If a user requests this feature, respond that it is not on the roadmap.

### PIN OVERRIDE LOGGING — NON-NEGOTIABLE
Drug interaction overrides for MAJOR and CONTRAINDICATED severity must log: timestamp, drug pair, severity level, overriding user ID, session ID. This log cannot be deleted or edited. It is the clinical safety data asset.

```typescript
// Required log schema for override events
interface InteractionOverrideLog {
  id: string;           // UUID
  timestamp: Date;      // server time, not device time
  drugA: string;        // drug name or code
  drugB: string;        // drug name or code
  severity: 'MAJOR' | 'CONTRAINDICATED';
  overriddenBy: string; // user ID of Pharmacist In-Charge
  sessionId: string;    // dispensing session ID
  reason?: string;      // optional reason field (surfaced in UI as optional text input)
}
```

---

## Subscription Tiers — Reference

| Tier | TZS/month | User seats | Outlets |
|---|---|---|---|
| ADDO / DLDM | 20,000 | 3 | 1 |
| Standard Pharmacy | 55,000 | 7 | 2 |
| Premium Pharmacy | 95,000 | 12 | 3 |
| Wholesale Pharmacy | 180,000 | 10 + delivery | 1 |
| Enterprise | Negotiated | Unlimited | Unlimited |
| Hybrid (retail + wholesale) | 230,000 | Retail + wholesale | Both |

Annual billing = 10× monthly (2 months free). Trial = 30 days, hard conversion, no extensions.

**Feature gates are enforced at the subscription tier level.** A Standard pharmacy cannot access Premium dashboard features. An ADDO cannot access dispensing safety features. Enforce this server-side, not just client-side.

---

## What's Built (Do Not Re-architect)

| Module | Status |
|---|---|
| Offline inventory: FEFO, expiry at 5 thresholds, barcode via camera, SMS alerts | ✅ Built |
| Drug interaction checker: 4 severity levels, PIN override for MAJOR/CONTRAINDICATED | ✅ Built |
| Contraindication alerts: 8 patient flags (ALL tiers) | ✅ Built |
| Dose calculator: Clark's rule + weight-based | ✅ Built |
| NCD usage hints: 9 disease areas | ✅ Built |
| Diagnosis-drug matching | ✅ Built |
| EFDMS/VFD: silent background compliance | ✅ Built |
| Owner revenue dashboard: real-time, remote access — ALL tiers | ✅ Built |
| B2B ordering: closed retail→wholesale network (open marketplace Phase 2 — available to all tiers when open, this is the revenue gate) | ✅ Built (closed) |
| Knowledge Hub: TMDA bulletins, recalls, reference content (CPD credit sub-module inside Knowledge Hub — blocked, see Phase Boundaries) | ✅ Built (content layer only) |
| Dispensing workflow: Full POS + records + void/reissue + discount (Standard/Premium/Wholesale); Basic POS for ADDO | ✅ Built |
| Contraindication alerts: 8 patient flags — ALL tiers | ✅ Built |
| Subscription tiers: pricing structure | ✅ Built |
| 30-day trial mechanic: hard end date | ✅ Built |

---

## Build Queue — Ordered by Priority

### P1 — Trial Onboarding Flow (ship blocker for pharmacy acquisition)

Goal: A new pharmacy owner must be able to complete full setup — stock import, pricing configuration, staff user creation — in under 30 minutes. The faster setup completes, the faster they experience value, the higher trial-to-paid conversion.

**Required screens/flows:**
1. Pharmacy profile setup (name, tier, owner contact, location)
2. Staff user creation with role assignment (Owner / Pharmacist In-Charge / Dispensing Technician)
3. Stock import: CSV upload OR manual entry with barcode scanning
4. Pricing configuration per stock item
5. Setup completion confirmation with first-login checklist

**Constraints:**
- Must work offline from step 1
- Swahili UI primary
- No EFDMS/TRA messaging at any point

---

### P2 — Premium Tier Dashboard Features

These four features must all be complete before Premium tier can be actively sold at TZS 95,000/month.

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
- Opt-in only — pharmacy must explicitly enable this in settings
- Data aggregated before comparison: never show raw data from another pharmacy
- Show: "Your gross margin vs. Arusha average" (anonymized)
- Show: "Your top-selling categories vs. network average"
- Never identify specific pharmacies in comparisons
- Requires network of 10+ opted-in pharmacies to activate (show placeholder until threshold)
```

---

### P3 — [BLOCKED] CPD Credit Tracking inside Knowledge Hub

**Do not build this.** The CPD credit-tracking sub-module lives inside Knowledge Hub and is structurally ready to be activated, but it cannot go live until a formal MOU or recognition agreement is signed with the Pharmacy Council of Tanzania. Without that agreement, any CPD credits the platform issues carry no official standing — which would actively mislead pharmacists about their compliance status.

**What is live:** Knowledge Hub content (TMDA bulletins, recalls, reference articles). Pharmacists can read and learn.

**What is blocked:** Credit tracking, CPD logs, annual requirement progress bars, PDF CPD record export. Do not build or activate any of this until the founder confirms the Pharmacy Council agreement is in place.

---

### P4 — Internal Trial Management Dashboard (founder-only, not customer-facing)

A simple admin view the founder uses to manage the 10-pharmacy pilot.

**Required fields per trial pharmacy:**
- Pharmacy name, tier, owner contact
- Trial start date, day count (auto-calculated), conversion deadline
- Feature usage: which modules were accessed in last 7 days (inventory / dispensing / dashboard / CPD)
- Conversion status: ACTIVE TRIAL / CONVERTED / CHURNED
- Notes field (founder's qualitative observations)
- Alert: highlight any trial pharmacy at day 25+ without conversion action

**Access:** Founder login only. Not linked from any customer-facing navigation.

---

## Clinical Safety Module — Drug Data Requirements

The drug interaction checker and contraindication alerts require a drug database. Confirm the current drug data source with the founder before modifying. If drug data needs to be updated or expanded:

- Prioritize drugs on Tanzania's Essential Medicines List (EML)
- Prioritize drug classes with high interaction frequency: anticoagulants, antiepileptics, antibiotics (especially fluoroquinolones), antidiabetics, antihypertensives
- NCD usage hints cover: diabetes, hypertension, epilepsy, asthma/COPD, HIV/ARV interactions, malaria, TB, anaemia, pregnancy — these 9 disease areas are the core
- Contraindication flags: pregnancy, breastfeeding, renal impairment, hepatic impairment, paediatric (<12 years), elderly (>65 years), allergy (penicillin, sulfa, aspirin), G6PD deficiency

Do not expand the drug interaction database beyond what can be maintained accurately. Inaccurate interaction data is worse than no interaction data in a clinical safety context.

---

## Data Architecture Principles

### Local-first storage
- All transactional data writes to local storage first
- Sync queue: every write event is added to a queue
- Sync worker: processes queue when online, handles conflicts with last-write-wins for inventory, merge for logs
- Conflict resolution: transaction logs are append-only (no conflicts). Inventory levels resolve to server state when online (server is source of truth for multi-device sync)

### Data that must be collected automatically
Build these analytics events into every relevant user action:
```
- interaction_alert_triggered: { drug_pair, severity, outcome: 'stopped' | 'overridden' }
- dose_calculator_used: { patient_weight, drug, calculated_dose }
- expired_stock_prevented: { product, quantity, estimated_value_tzs }
- ncd_hint_displayed: { disease_area, drug_dispensed }
- cpd_module_completed: { module_id, duration_minutes, credit_value }
- trial_day_usage: { pharmacy_id, trial_day, modules_accessed[] }
```
These events become the health impact data story for i3, Villgro, and academic partners (MUHAS, LSHTM). Every clinical safety event logged is evidence of adverse events prevented.

### Privacy
- Pharmacy-level data: owned by that pharmacy, accessible only to their users and the founder's admin view
- Peer benchmarking: only aggregated, never row-level, only when opted in
- Drug interaction logs: available to pharmacy owner and Pharmacist In-Charge, exportable as PDF
- No patient identifiable data stored — dispensing records reference patient flags (pregnancy, renal impairment, etc.) but not patient names or IDs

---

## Tech Decisions to Maintain

These have been made. Do not propose alternatives without a strong technical reason:

| Decision | Rationale |
|---|---|
| Offline-first (local DB + sync) | Tanzania connectivity reality. Non-negotiable. |
| Barcode scanning via phone camera | No external hardware dependency. Works on any Android phone. |
| SMS alerts for low-stock | Reliable delivery in low-internet environments. Does not require app to be open. |
| EFDMS in background | Legal shield and capital access benefits are real but sales-context sensitive. Never surface to users. |
| Hard trial end date (no extensions) | Reveals genuine value seekers. Soft trials produce polite tolerators who never convert. |

---

---

## Phase Boundaries — Do Not Cross

| Phase | Trigger | What unlocks |
|---|---|---|
| Phase 1 | Now → 50 paying pharmacies | Subscription revenue only. Closed B2B. Knowledge Hub (content only). No CPD credit tracking until Pharmacy Council MOU signed. No open marketplace. |
| Phase 2 | 50 paying pharmacies | Open B2B marketplace. CPD sponsorship conversations with pharma companies. Academic MOU (MUHAS/LSHTM). Institutional licensing. Embedded lending MVP. |
| Phase 3 | 200+ paying pharmacies | Data licensing. Open API. AI clinical decision support. Patient-facing features. Dar es Salaam expansion to 200–300 pharmacies. |

Building Phase 2 or 3 features in Phase 1 is a resource allocation failure. Bootstrap capital is TZS 2.4M. Every build hour spent on Phase 3 features is an hour not spent getting to 10 paying pharmacies.

---

*Last updated: April 2026*
*Founder: Elihaki M. Y. Javan · PharmaConnect · Arusha, Tanzania*
