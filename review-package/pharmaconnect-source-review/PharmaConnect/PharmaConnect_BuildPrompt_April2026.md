# PharmaConnect — Claude Code / Codex Build Prompt
**April 2026 · Sprint: Pharmacy Acquisition Readiness**

Paste this prompt into Claude Code or Codex at the start of a build session. It is self-contained — you do not need any other context to begin.

---

## Who You Are Building For

**Elihaki M. Y. Javan** — Founder & CEO, PharmaConnect, Arusha, Tanzania. Pharmaceutical Technologist by training. Not a software engineer. Building with AI-assisted coding (vibe coding) until 50 paying pharmacies, then hiring a developer. Bootstrap capital: TZS 2.4M.

The platform is already in production. You are not starting from zero. You are building the next layer on top of a working pharmacy OS.

---

## What PharmaConnect Is

Tanzania's first offline-first pharmacy operating system, targeting ~15,600 pharmacy outlets (1,600 registered pharmacies + 14,000+ ADDOs). Phase 1: Arusha pilot. The core features are built. The immediate business problem is converting the first 10 pharmacies from free trial to paying subscribers.

**Critical distinction:** Every feature you build must be evaluated against one question — does this help get to 10 paying pharmacies? If it doesn't, it is Phase 2 or Phase 3 work. Do not build it now.

---

## What Is Already Built (Do Not Rebuild)

| Module | Status |
|---|---|
| Offline-first inventory: FEFO, expiry monitoring at 5 thresholds, barcode scanning via phone camera, low-stock SMS alerts | ✅ Complete |
| Dispensing safety suite: drug interaction checker (4 severity levels), contraindication alerts (8 patient flags), dose calculator (Clark's rule + weight-based), NCD usage hints (9 disease areas), diagnosis-drug matching | ✅ Complete |
| EFDMS/VFD compliance: silent background integration, auto-generates TRA-compliant receipts | ✅ Complete |
| Owner revenue dashboard: real-time profit/margin, accessible remotely | ✅ Complete |
| Closed B2B ordering: retail pharmacies ordering from enrolled wholesale pharmacies | ✅ Complete |
| CPD education hub: initial modules, Knowledge Hub read access | ✅ Complete |
| Dispensing workflow: POS, records, void/reissue, discount management | ✅ Complete |
| Subscription tier structure: ADDO TZS 20K / Essential TZS 35K / Standard TZS 55K / Premium TZS 75K / Wholesale TZS 100K / Enterprise custom | ✅ Complete |
| 14-day trial mechanic: hard end date, no extensions | ✅ Complete |

---

## What Has Not Been Built Yet — Prioritized Build Queue

Work through these in order. Do not jump to a lower-priority item before completing a higher one.

---

### BUILD 1 — Trial Onboarding Flow [HIGHEST PRIORITY]

**Why this matters:** The faster a new pharmacy completes setup, the faster they experience value, the higher the trial-to-paid conversion rate. Currently, if setup takes more than 30 minutes, owners lose interest.

**What to build:** A guided onboarding flow that walks a new pharmacy from registration to first transaction-ready state in under 30 minutes.

**Required steps:**

**Step 1 — Pharmacy profile**
- Pharmacy name
- Subscription tier selection (ADDO / Standard / Premium / Wholesale)
- Owner full name + phone number (primary contact)
- Location: region (default Arusha), district, street
- License number (TMDA registration) — store for compliance records, do not surface in UI as TRA/EFDMS

**Step 2 — Staff user creation**
- Owner creates at least one staff user before setup completes
- Roles: Owner / Pharmacist In-Charge / Dispensing Technician
- Pharmacist In-Charge role: required for PIN override of MAJOR/CONTRAINDICATED drug interactions
- Minimum: 1 staff user must be created. Maximum per tier enforced by subscription limits.

**Step 3 — Stock import**
- Option A: CSV upload (provide downloadable template)
- Option B: Manual entry with phone camera barcode scan
- Required fields per item: product name, generic name, barcode (if available), supplier, quantity on hand, cost price, selling price, expiry date, category
- FEFO automatically activated on any product with expiry date entered

**Step 4 — Pricing configuration**
- Default: selling price entered during stock import
- Allow override of pricing per product after import
- Simple flat-price model only in Phase 1. No tiered pricing or promotions yet.

**Step 5 — Setup complete**
- Summary: X products loaded, Y staff users created
- First-login checklist: try a dispensing transaction / check owner dashboard / run a stock report
- No EFDMS/TRA messaging at any point in this flow

**Constraints:**
- Must work fully offline from Step 1 onwards
- Swahili UI primary throughout
- Progress saved at each step — owner can leave and return without starting over
- Mobile-first layout. Test on a small Android phone screen (360px width).

---

### BUILD 2 — Internal Trial Management Dashboard [HIGH PRIORITY]

**Why this matters:** The 14-day trial mechanic is the core conversion tool. Without visibility into which trial pharmacies are engaging, the founder cannot intervene before a trial expires unconverted.

**What to build:** A founder-only admin screen (not accessible from customer navigation) that shows the status of every pharmacy in active trial.

**Required fields per trial pharmacy:**

```
Pharmacy name
Subscription tier
Owner name + phone
Trial start date
Days elapsed (auto-calculated from start date)
Trial end date (= start date + 30 days)
Conversion deadline alert: highlight RED if day 25+ and status is not CONVERTED
Feature usage last 7 days:
  - Inventory module: Y/N (any stock entry, expiry check, or stock report)
  - Dispensing module: Y/N (any dispensing session opened)
  - Owner dashboard: Y/N (any dashboard view by owner role)
  - CPD hub: Y/N (any module opened)
Conversion status: ACTIVE TRIAL / CONVERTED / CHURNED
Notes: free text field for founder's qualitative observations
Last login: most recent user activity timestamp
```

**Sorting:** Default sort by trial end date ascending (most urgent conversions at top).

**Alerts:** 
- Day 25+ without conversion status → highlight row in red
- 7+ days with zero logins → highlight row in yellow (disengaged trial)

**Access control:** Only accounts with `role: ADMIN` can see this screen. Never expose this URL in customer-facing navigation.

**This is not a customer feature. It is an operational cockpit for managing pilot pharmacy acquisition.**

---

### BUILD 3 — Premium Tier: Predictive Low-Stock Alerts [HIGH PRIORITY]

**Why this matters:** This is the primary justification for the TZS 75,000/month Premium price point. Without it, Premium is the same as Standard with remote dashboard access — hard to justify the 20K premium.

**Logic:**
```
avg_daily_velocity = sum(units_sold, last_30_days) / 30
days_of_stock_remaining = current_stock_quantity / avg_daily_velocity
flag_critical if days_of_stock_remaining < 7
flag_warning if days_of_stock_remaining < 14
```

**Display:**
- Sorted list: products with lowest days_of_stock_remaining at top
- Show: product name, current quantity, estimated days remaining, recommended reorder quantity (= 30-day velocity × 1.5)
- Reorder button: triggers a B2B order to connected wholesale pharmacy (if enrolled), or shows supplier contact info

**Edge cases:**
- Products with zero sales in 30 days: exclude from the predictive list (no velocity to calculate)
- New products (< 7 days of sales data): flag as "Insufficient data — monitor manually"
- Products with expiry < 14 days: always flag regardless of stock level (expiry risk overrides stock level logic)

**Must work offline:** Calculate from local transaction history. No server call required.

---

### BUILD 4 — Premium Tier: Dead Stock Risk Scoring [MEDIUM PRIORITY]

**Why this matters:** Expired stock write-offs are one of the most painful financial events for pharmacy owners. This feature prevents them by flagging products heading toward write-off before they expire.

**Logic:**
```
risk_score = days_since_last_sale × (1 / max(days_to_expiry, 1))
// Higher score = higher risk
```

**Flag conditions:**
- last_sale_date > 30 days ago AND expiry_date < 90 days away → high risk
- last_sale_date > 14 days ago AND expiry_date < 60 days away → medium risk

**Display:**
- Risk-ranked list, highest risk at top
- Show: product name, last sale date, expiry date, quantity on hand, estimated write-off value (quantity × cost_price)
- Total estimated write-off value at risk shown as summary figure at top of screen

**Must work offline.**

---

### BUILD 5 — [BLOCKED] CPD Credit Tracking inside Knowledge Hub

**Do not build this.** The CPD credit-tracking sub-module is a planned feature inside the Knowledge Hub module, but it is blocked until a formal MOU or recognition agreement is in place with the Pharmacy Council of Tanzania. Issuing CPD credits without that authority misleads pharmacists about their compliance standing.

**What is currently live:** Knowledge Hub content — TMDA bulletins, recalls, reference articles. Pharmacists can read. No credits issued.

**What to do when the Pharmacy Council MOU is signed:** Return to this item. At that point, add credit tracking, CPD logs, annual requirement progress bars, and PDF CPD record export inside the Knowledge Hub module.

**Do not build any part of this now. It is not a build priority — it is a regulatory/partnership prerequisite.**

---

### BUILD 6 — Peer Benchmarking (Premium Only) [LOWER PRIORITY — needs 10+ opted-in pharmacies first]

**Do not build this until 10+ pharmacies have opted in.** Show a placeholder screen until threshold is reached.

**When threshold is met:**

**Privacy rules (non-negotiable):**
- Opt-in only: pharmacy must explicitly enable in settings. Default is OFF.
- Data shown is always aggregated across the network — never a single pharmacy's raw data
- Never allow one pharmacy to identify another

**Metrics to show (anonymized):**
- Your gross margin % vs. Arusha network average
- Your top 5 selling categories vs. network top 5
- Your average transaction value vs. network average
- Your monthly retention rate (% of repeat customers) vs. network average

**Display:** Simple comparison bars/charts. No tables of raw numbers.

---

## Hard Constraints — These Apply to Everything You Build

### 1. Offline-first always
No feature may show an error or be unavailable when the device has no internet connection. Every feature writes to local storage first. Sync happens when connection is available.

### 2. EFDMS never surfaces in UI
EFDMS/VFD/TRA compliance runs silently in the background. Zero user-facing labels, badges, notifications, or confirmations referencing TRA, EFDMS, VFD, or fiscal receipts.

### 3. NHIF/UHI is not a feature
Do not build any NHIF claims integration, UHI, or health insurance processing. If you encounter references to this in the codebase, leave them — do not expand them.

### 4. Drug interaction override logging is mandatory
Every MAJOR or CONTRAINDICATED interaction override must log: timestamp, drug pair, severity, overriding user ID, session ID. Append-only. No delete/edit.

### 5. Feature gates are server-side enforced
A Standard pharmacy must not be able to access Premium features by manipulating client-side code. Subscription tier validation happens on the server for every gated feature request.

### 6. Phase boundaries
Do not build Phase 2 or 3 features. The full list of what not to build:
- Open B2B marketplace (closed network only now)
- Embedded lending / credit scoring
- Data licensing dashboard
- CPD credit tracking / CPD log / Pharmacy Council compliance features — **blocked until MOU with Pharmacy Council is signed, regardless of phase**
- Video-based CPD modules
- Patient-facing app
- API layer for third-party integrations
- AI clinical decision support (beyond existing dispensing safety suite)
- NHIF/UHI (mentioned again for emphasis)
- Swahili UI / localization — not needed

---

## What's Missing from Documents (Gap Analysis — April 2026)

These are gaps in the founder's operational documents, not the platform. If you can help produce these, do so after completing the platform builds above:

| Missing | What It Is | Priority |
|---|---|---|
| Tony Elumelu Foundation application | TEF gives $5K non-equity seed + mentorship. "Apply now" listed in strategy but no application document has been created. Apply at tefconnect.com/apply | URGENT |
| Pharmacy prospect tracker | A simple spreadsheet or database to track: pharmacy name, owner, location, qualification score (green/red flags from acquisition kit), outreach date, trial start, conversion status. Currently not tracked anywhere. | URGENT |
| Trial pharmacy management (manual) | Until Build 2 (internal dashboard) is complete, a manual trial tracker is needed: pharmacy name, trial start, day count, modules being used, conversion deadline. | URGENT |
| PST formal partnership proposal | The board outreach email to Fadhili Hezekiah mentions the PST partnership in an email. There is no standalone formal proposal document — a 1-page proposal memo that can be handed to Hezekiah at a meeting. | HIGH |
| Milestone tracker | The Master Action Plan has a "Milestone Tracker" section that is empty. Populate it with: target date, milestone, status, actual date achieved. This is the living document the founder uses to assess progress. | HIGH |
| Tony Elumelu Foundation application | Deadline is typically in June/July annually. Application requires: business description, problem statement, market size, revenue model, social impact, financial projections for 3 years, founder background. Content from COSTECH application can be adapted. | URGENT |
| Financial projections (3-year model) | Required by COSTECH, TEF, and Villgro. Must show: MRR trajectory by pharmacy count, cost structure, path to TZS 2M MRR at 50 pharmacies and TZS 14M at 200. Simple spreadsheet model. | HIGH |

---

## Metrics the Platform Must Track (for i3 / Villgro grant applications)

Every one of these events must be logged automatically. They are the health impact story:

```
interaction_alert_triggered → count per month (= adverse events prevented)
interaction_overridden → count per month with severity (= safety events documented)
dose_calculator_used → count per month (= correct paediatric/adult dosing)
expired_stock_prevented → quantity + estimated TZS value per month
ncd_hint_displayed → count per month by disease area
cpd_module_completed → count per month (professional development metric)
```

When the founder applies to i3 Cohort 4, these numbers become the evidence. Three months of pilot data showing hundreds of interaction alerts triggered, zero adverse events reported, and TZS X value of expired stock prevented is a story that funds at the $225K level.

---

## Test Checklist Before Shipping Any Feature

- [ ] Works offline (no internet connection): core function operates
- [ ] Works on slow connection (2G simulation): sync queue operates without data loss
- [ ] Feature gate: Premium features not accessible on Standard account
- [ ] No EFDMS/TRA text in any UI element
- [ ] On Android phone (360px width): layout is usable
- [ ] Drug interaction override (if relevant): override log entry created correctly
- [ ] Offline sync: data created offline syncs correctly when connection restored

---

*Self-contained build brief — April 2026*
*PharmaConnect · Arusha, Tanzania*
*Founder: Elihaki M. Y. Javan*
