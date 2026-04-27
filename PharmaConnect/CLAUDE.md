# CLAUDE.md — PharmaConnect

**Read this file before writing a single line of code.**
This is the ground truth for the PharmaConnect build. Strategic context, architecture decisions, feature priorities, and hard constraints are all here. When in doubt, come back to this file.

---

## What PharmaConnect Is

Tanzania's first offline-first pharmacy operating system. Target market: ~15,600 pharmacy outlets — 1,600 registered pharmacies + 14,000+ Accredited Drug Dispensing Outlets (ADDOs). Phase 1 is an Arusha pilot.

The strategic model follows Medscape's evolution: embed as the daily pharmacy OS first (single-player value, no network needed), then layer CPD education, B2B marketplace, and data monetization. Monetize the network — pharma companies, data consumers, marketplace commissions — not the practitioner. Subscriptions stay low-cost.

**Founder:** Elihaki M. Y. Javan — Pharmaceutical Technologist, former Pharmacy In-Charge at Lindi Regional Hospital, supply chain experience across national MOH/PO-RALG programmes, TAPHATA member. Not a software founder. A pharmacy domain expert building with AI-assisted coding. The product is domain-knowledge-first.

---

## Current Build State (April 2026)

These are built and in production or near-production. Do not re-architect unless there is a hard technical reason.

### ✅ Built

| Module | Details |
|---|---|
| Offline-first inventory | FEFO tracking, expiry monitoring at 5 thresholds, barcode scanning via phone camera, low-stock SMS alerts |
| Dispensing safety suite | Drug interaction checker (4 severity levels: MINOR / MODERATE / MAJOR / CONTRAINDICATED); PIN override required for MAJOR and CONTRAINDICATED by Pharmacist In-Charge |
| Dispensing safety suite | Contraindication alerts across 8 patient status flags; dose calculator (Clark's rule + weight-based); NCD usage hints for 9 disease areas; diagnosis-drug matching |
| EFDMS/VFD compliance | Runs silently in background. Auto-generates TRA-compliant receipts on every transaction |
| Owner revenue dashboard | Real-time profit/margin visibility, accessible remotely from owner's device |
| B2B ordering (closed) | Retail pharmacies order from wholesale pharmacies registered on platform. Closed network — not open marketplace yet |
| Knowledge Hub | TMDA bulletins, recalls, and reference content. CPD credit tracking is a sub-module inside Knowledge Hub — not yet active (see CPD note below) |
| Dispensing workflow | POS, dispensing records, void and reissue workflow, discount management |
| Subscription tiers | ADDO TZS 20K / Standard TZS 55K / Premium TZS 95K / Wholesale TZS 180K / Enterprise negotiated / Hybrid TZS 230K |
| 30-day trial mechanic | Hard end date, no extensions |

### ⏳ In Progress

| Module | What's Missing |
|---|---|
| Offline sync reliability | Improve sync-when-connected architecture for low-connectivity Arusha reality |
| Premium dashboard | Add: predictive low-stock alerts (7–14 days ahead), demand forecasting (top 50 products), dead stock risk scoring, peer benchmarking (opt-in, anonymized), revenue trend projection, peak hour analysis |

### 🔲 Not Yet Built (Phase 2+)

Do not build these until 50+ paying pharmacies are live:

- Open B2B marketplace (currently closed network — keep it closed until Phase 2)
- Embedded lending / credit scoring via transaction history
- Anonymized data licensing dashboard
- CPD credit tracking / CPD log / Pharmacy Council compliance structure — **blocked until MOU/agreement with Pharmacy Council is signed. Do not build this feature.** The Knowledge Hub content layer (bulletins, recalls, reference articles) is live. The CPD credit-tracking sub-module inside Knowledge Hub is not.
- CPD credit reporting automation to Pharmacy Council
- Video-based CPD modules
- Patient-facing features
- API layer for third-party integrations
- AI clinical decision support (beyond what's already in the dispensing safety suite)

---

## Architecture Ground Rules

### 1. Offline-first is non-negotiable

Tanzania's pharmacy reality: intermittent connectivity, especially in smaller Arusha-area outlets. Every core function must work without an internet connection. Data syncs automatically when connection is available. This is the primary technical moat against mPharma (cloud-native) and Helium Health (cloud-native).

**Rule:** If a feature breaks when the device has no internet, it is not shippable.

### 2. Mobile-first display, but desktop must work

Most pharmacy owners access the owner dashboard from a phone. Dispensing staff use it at a counter — often a tablet or small desktop screen. Both layouts must be functional. Mobile is primary.

### 3. EFDMS runs in the background — never surfaced in UI

Do not add EFDMS-related messaging, badges, icons, or confirmations to the UI unless a transaction explicitly fails compliance. It runs silently. The legal shield and capital access benefits are real, but they are a 60–90 day trust conversation the founder has with pharmacy owners in person — not a software notification.

**Rule:** No TRA, VFD, or EFDMS language in any user-facing UI element.

### 4. Drug interaction checker — PIN override must be logged

When a Pharmacist In-Charge overrides a MAJOR or CONTRAINDICATED interaction, the override must be logged with: timestamp, drug pair, severity level, and the overriding user's credentials. This log is the clinical safety data asset.

### 5. Session-based dispensing

Dispensing sessions are tied to a logged-in user. Each dispensing event is attributed to a specific staff member. This creates the accountability trail that owners care about.

### 6. NHIF/UHI integration: do not build

NHIF reimburses below market price in Tanzania. Private pharmacies lose money on NHIF claims. Do not add NHIF integration, claim submission, or UHI-related features. Deprioritized until NHIF reforms reimbursement rates. This is not a technical decision — it is an economic and strategic one.

### 7. No network effects required for single-player value

Phase 1 features must deliver value to a pharmacy operating in complete isolation on the platform. Do not build features that require other pharmacies to be on the platform to function (that's Phase 2 and 3). The only Phase 1 exception is the closed B2B ordering — which already exists and requires wholesale pharmacies to be enrolled.

---

## Feature Priority Stack — What to Build Next

Ordered strictly. Do not skip ahead.

### Priority 1 — Acquire 10 paying pharmacies (Platform)
The 10-pharmacy milestone unlocks everything: funder conversations, board outreach, investor credibility. The platform already has what's needed for this. The build priority is removing friction from the trial experience.

- **Trial onboarding flow:** Guided setup for a new pharmacy — enter stock, set pricing, configure staff users — in under 30 minutes. The faster a pharmacy is set up, the faster they see value.
- **Owner dashboard remote access:** Must work cleanly on mobile with slow connection. This is the feature that generates "aha" moments when owners check their revenue from home.

### Priority 2 — Premium tier completion
Required before pitching Premium to any pharmacy. These features justify the TZS 95K price point.

- Predictive low-stock: flag products projected to run out within 7–14 days based on recent sales velocity
- Demand forecasting: top 50 products, 12-month seasonal patterns
- Dead stock risk scoring: flag products with declining velocity before they expire
- Peer benchmarking (opt-in, anonymized): show how a pharmacy's margins compare to Arusha average

### Priority 3 — Trial management dashboard (internal tool, founder-only)
The 30-day trial mechanic only works if you can track it. Build a simple internal view showing:
- Active trial pharmacies with start date, day count, conversion deadline
- Which modules each trial pharmacy is actually using (usage analytics)
- Conversion status: trial / converted / churned

This is not a customer-facing screen. It is the founder's operational cockpit for managing trials.

---

## Tier Feature Map — Reference

| Feature | ADDO | Standard | Premium | Wholesale |
|---|---|---|---|---|
| Offline inventory (FEFO, expiry, barcode, SMS alerts) | ✅ | ✅ | ✅ | ✅ |
| TMDA compliance tracker + document storage | ✅ | ✅ | ✅ | ✅ |
| Knowledge Hub (bulletins, recalls, reference content) | ✅ | ✅ | ✅ | ✅ |
| Basic reports | ✅ | ✅ | ✅ | ✅ |
| Remote owner dashboard (real-time, remote access) | ✅ | ✅ | Full + analytics | ✅ |
| Contraindication alerts (8 patient flags) | ✅ | ✅ | ✅ | ✅ |
| POS | Basic (simple, like competitors) | ✅ Full | ✅ Full | ✅ |
| Drug interaction checker (4 severity levels) | ❌ | ✅ | ✅ | ❌ |
| Dose calculator (Clark's + weight-based) | ❌ | ✅ | ✅ | ❌ |
| NCD usage hints (9 disease areas) | ❌ | ✅ | ✅ | ❌ |
| Full dispensing workflow (records, void/reissue, discount) | ❌ | ✅ | ✅ | ❌ |
| B2B ordering (open marketplace — Phase 2, revenue gate for all tiers) | All tiers when open | All tiers when open | All tiers when open | Receives + sends |
| Predictive low-stock (7–14 day) | ❌ | ❌ | ✅ | ❌ |
| Demand forecasting (top 50 products) | ❌ | ❌ | ✅ | ❌ |
| Dead stock risk scoring | ❌ | ❌ | ✅ | ❌ |
| Peer benchmarking (opt-in, anonymized) | ❌ | ❌ | ✅ | ❌ |
| Knowledge Hub — CPD credit tracking (inside Knowledge Hub, blocked pending Pharmacy Council MOU) | ❌ | ❌ | 🔲 | ❌ |
| Wholesale order management (product catalogue, tiered pricing) | ❌ | ❌ | ❌ | ✅ |
| Delivery scheduling + driver assignment | ❌ | ❌ | ❌ | ✅ |
| VAT-compliant invoice generation | ❌ | ❌ | ❌ | ✅ |
| Receivables tracking + credit limits per client | ❌ | ❌ | ❌ | ✅ |
| Demand intelligence from client pharmacy network | ❌ | ❌ | ❌ | ✅ |

---

## What NOT to Build (Hard Stops)

These are strategic decisions, not missing features. Do not build them:

| Don't Build | Why |
|---|---|
| NHIF/UHI claims integration | Financial threat to pharmacy owners. Deprioritized until NHIF reforms reimbursement. |
| CPD credit tracking / CPD log | Blocked until MOU/agreement with Pharmacy Council is signed. Knowledge Hub content is live. CPD sub-module is not. |
| Open B2B marketplace | Phase 2. Requires network density. Closed network is Phase 1. |
| Patient-facing app | Phase 3. Distraction from the pharmacy OS. |
| API for third-party integrations | Phase 3. Not before data asset is large enough to have value. |
| Anything requiring constant internet | Core offline-first principle. |
| TRA/EFDMS-branded UI elements | Never surface EFDMS to users explicitly. Runs silently. |
| Swahili UI | Not needed — do not add Swahili localization. English only. |

---

## Competitive Context — Know This

| Competitor | Position | Response |
|---|---|---|
| DukaDawa | Direct. POS + inventory, TZS 49K/month Standard. No clinical tools, no CPD, no offline-first. | Never compete on price. Compete on clinical and compliance ground. 6,000 TZS difference = TZS 200/day. One prevented expired batch covers months of subscription. |
| Maisha Meds | USAID-dependent nonprofit PBM. Hit by 2025 USAID shutdown. | Former enrolled pharmacies in Tanzania are conversion targets. Commercial model is PharmaConnect's structural advantage over this. |
| mPharma | $95.3M raised, 9 countries, NOT in Tanzania as of April 2026. Francophone West Africa focus. | Most likely future acquirer. Build for acquisition readiness — deep data, TMDA integration, Pharmacy Council CPD relationship. |
| DukaDawa comparison | Do not make pricing comparisons in UI or marketing materials | Value comparison only: clinical tools + compliance + education vs. POS-only |

---

## Metrics That Matter — Track These

### Phase 1 KPIs (target by Month 6)
- Monthly active pharmacies: 50 → 100
- DAU/pharmacy ratio: >60% (daily engagement proof)
- Monthly retention: >70%
- Transactions tracked/month: 5,000+
- MRR: TZS 500K → TZS 2M
- Net Promoter Score: >40

### What the platform must log automatically (data asset)
Every item below is automatically collectible from the platform and becomes the health impact data story for i3, Villgro, and academic partners:
- Drug interaction alerts triggered per month (each one = a potential adverse event prevented)
- MAJOR/CONTRAINDICATED interactions overridden — with override reason logged
- Correct paediatric doses calculated via dose calculator (vs. estimated from memory)
- NCD counselling sessions completed with dispensing event
- Expired stock prevented as % of total stock value across network

---

## Build Approach

**Vibe coding phase:** Claude Code is the primary build tool until 50 paying pharmacies. Then hire a developer. Bootstrap capital: TZS 2.4M.

**Ship threshold:** A feature is ready to ship when it works offline, shows the correct Swahili UI, and does not surface EFDMS/TRA branding. Clinical safety features additionally require: override logging functional, PIN requirement enforced for MAJOR/CONTRAINDICATED interactions.

**Test on real Tanzania connectivity:** Before marking any sync feature complete, test with intermittent connectivity simulation (drop network mid-transaction, restore, verify data integrity).

---

## Key Documents

| Document | Location | Purpose |
|---|---|---|
| 36-month platform strategy | `PharmaConnect_Strategy.docx` | Phase roadmap, KPIs, monetization, exit scenarios |
| Board recruitment guide | `PharmaConnect_Board_Recruitment.docx` | 30 candidates, 3-wave sequencing, contact details |
| Revenue & funder strategy | `PharmaConnect_Revenue_Funder_Strategy.docx` | Pricing rationale, revenue streams, funder framing |
| Master action plan | `PharmaConnect_Master_Action_Plan.docx` | Done/in-progress/remaining tasks |
| Pharmacy acquisition kit | `PharmaConnect_Acquisition_Kit.docx` | How to find, qualify, and sign trial pharmacies |
| Board outreach emails | `PharmaConnect_Board_Outreach_Emails.docx` | Personalized Wave 1 board outreach |
| COSTECH application | `PharmaConnect_COSTECH_Application.docx` | Credit Guarantee Scheme application content |

---

*Last updated: April 2026 · Elihaki M. Y. Javan · Founder & CEO*
