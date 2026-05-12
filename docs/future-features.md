# PharmaConnect — Future Features & Deferred Work
# Living document · Update this file whenever a feature ships or a new one is agreed

**How to use this file**
When a feature ships, move it to the Shipped section at the bottom and add the date.
When a new feature is agreed, add it under the correct category with its blocker and decision date.
Never delete entries — mark them SHIPPED or CANCELLED with a reason.

---

## Status key

| Status | Meaning |
|---|---|
| DEFERRED | Agreed to build — blocked by a dependency not yet met |
| SCHEMA READY | Migration written, no UI/API yet — ready to activate when unblocked |
| PLACEHOLDER | Deferred page exists in app — users see "coming soon" |
| BACKLOG | Identified, not yet formally agreed |
| CANCELLED | Decided not to build — reason recorded |
| SHIPPED | Live in production — date recorded |

---

## Regulatory & Compliance

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| NHIF Claims Module — full Breeze API submission | PLACEHOLDER | NHIF Breeze API accreditation from NHIF for PharmaConnect | Session 1 |
| Controlled Substances TMDA Reporting | PLACEHOLDER | TMDA notification and electronic reporting approval | Session 1 |
| Prescription Management (digital Rx) | PLACEHOLDER | PC + TMDA joint digital prescription framework | Session 1 |
| UHI / NHIF dispensing data fields (patientNidaId, prescriberId, facilityCode on DispensingItem) | DEFERRED | UHI integration spec from TIRA; add optional fields to dispensing schema before Phase 2 NHIF build | Apr 2026 |
| EFDMS Protocol 2.1 VFD upgrade | DEFERRED | Current VFD integration must be verified against Protocol 2.1 spec (QR + verification code) before go-live | Apr 2026 |
| PDPC registration as data controller | DEFERRED | Founder action — register at pdpc.go.tz before scaling paying customers; not a code task | Apr 2026 |
| Pharmacovigilance — ADR form and TMDA submission | SCHEMA READY · PLACEHOLDER | TMDA electronic ADR reporting system integration; schema and placeholder shipped | Apr 2026 |
| AWaRe antibiotic classification display | SHIPPED | — | Apr 2026 |

---

## Patient Safety

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Persistent patient records (full patient profile, allergy history across visits) | DEFERRED | PDPC registration + MOH MOU for health data storage | Session 1 |
| Clinical OTC Symptom Tool | DEFERRED | PharmaConnect written clinical position statement approved by clinical advisor | Session 1 |
| PC-Accredited CPD courses | PLACEHOLDER | Pharmacy Council MOU for accredited CPD content | Session 1 |
| AI-assisted drug counselling service (beyond rule-based) | DEFERRED | Clinical governance policy; LLM provider contract; rule-based system must be stable first | Session 1 |
| Cold chain temperature logging (UI + API) | SCHEMA READY | Schema migration shipped; UI and API deferred until GSDP compliance audit request from a pharmacy or TMDA | Apr 2026 |
| Patient adherence and refill reminders via SMS/WhatsApp | BACKLOG | Requires 3–6 months of real dispensing data per pharmacy; Africa's Talking already wired; define missed-refill logic per drug class first | Apr 2026 |
| Age-based dosing alerts (paediatric weight input at dispensing) | BACKLOG | Clark's rule and BSA formula exist in backend logic; needs UI input field for weight and age at dispensing session | Session 1 |
| Pregnancy and lactation flag at dispensing (session input) | BACKLOG | Session flag exists in safety check; UI needs explicit toggle at start of dispensing session | Session 1 |

---

## Dispensing & Inventory

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Retail Order Preparation — multi-supplier stock ordering cart with smart low-stock suggestions, draft persistence, printable PO per supplier, and receive-against-PO intake link | DEFERRED | Schema (StockOrder + StockOrderItem + lastSupplierId on Product) not yet written; see tasks/retail-order-preparation-codex-prompt.md for full spec | Apr 2026 |
| Dispensing daily-close service (revenue aggregate, close-of-day report) | DEFERRED | Backend service truncated; see ClaudeCode_Tasks_Prompt.md Task A | Apr 2026 |
| Barcode scanning for dispensing (camera + external scanner) | DEFERRED | WHOLESALE_COUNTER_STAFF barcode schema exists; retail dispensing UI integration needed | Session 1 |
| Multi-outlet inventory visibility (A15) | DEFERRED | ENTERPRISE tier only; requires inter-pharmacy data sharing consent model | Session 1 |
| Inter-branch stock transfer (A16) | DEFERRED | ENTERPRISE tier only; depends on A15 multi-outlet visibility | Session 1 |
| CSV bulk import for inventory | DEFERRED | Validation rules and FEFO batch assignment on import need spec | Session 1 |
| Stock exchange (peer-to-peer surplus trading) | PLACEHOLDER | Phase 2 — requires B2B network and credit model to be live first | Session 1 |

---

## Wholesale

**Decision: Entire wholesale module is DEFERRED. MVP targets retail pharmacies and ADDOs only. Wholesale code exists in the codebase but is not actively sold or maintained as Phase 1 scope. No wholesale development work until at least 20 paying retail pharmacies are live.**

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Wholesale module — activate for paying customers (basic catalogue, orders, picking, delivery confirmation) | DEFERRED | Minimum 20 paying retail pharmacies live first; wholesale onboarding flow does not exist yet; founder decision required to re-open | Apr 2026 |
| Wholesale onboarding flow (wizard to set up a wholesale pharmacy account, import catalogue, configure tier prices) | DEFERRED | Must be built before any wholesale pharmacy can self-serve; currently no onboarding exists for any tier | Apr 2026 |
| Wholesale returns and credit notes | DEFERRED | Wholesale module activation required first; schema and endpoint design in ClaudeCode_Tasks_Prompt.md Task C | Apr 2026 |
| Purchase orders to upstream suppliers | DEFERRED | Wholesale module activation required first; Task D | Apr 2026 |
| Delivery manifests and multi-route management | DEFERRED | Wholesale module activation required first; Task E | Apr 2026 |
| Per-client wholesale price overrides | DEFERRED | Wholesale module activation required first; Task F | Apr 2026 |
| Walk-in / counter order creation (staff creates order on behalf of walk-in customer) | DEFERRED | Wholesale module activation required first; anonymous buyer / quick-register flow needed | Apr 2026 |
| Retail-to-supplier order initiation (retail pharmacy orders from a known wholesale supplier) | DEFERRED | Wholesale module activation + supplier discovery browse flow; Tasks C–F complete first | Apr 2026 |
| Medicine marketplace — cross-supplier price comparison and supplier-grouped cart | DEFERRED | Requires network of ≥3 active wholesale pharmacies, catalogue indexing, cross-pharmacy price query API, and cart-to-multi-order conversion; Phase 3 earliest | Apr 2026 |
| B2B ordering network for retail pharmacies | PLACEHOLDER | Phase 3 — all wholesale infrastructure above must be stable and selling first | Session 1 |

---

## Analytics & Reporting

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Forecasting — stockout prediction (real engine) | DEFERRED | Stub endpoint exists; real moving-average service in ClaudeCode_Tasks_Prompt.md Task B1 | Apr 2026 |
| Forecasting — 12-month seasonality chart | DEFERRED | Stub endpoint exists; real aggregation in Task B2; PREMIUM/ENTERPRISE gate | Apr 2026 |
| Forecasting — dead stock ranking | DEFERRED | Stub endpoint exists; real scoring in Task B2; gated above ADDO | Apr 2026 |
| Forecasting — regional demand insights | DEFERRED | Phase 2 — requires network-wide anonymised data pooling across multiple outlets | Apr 2026 |
| Custom report builder | DEFERRED | CODEX_TASKS.md Task 9; SQL injection protection required; OWNER/PIC/ACCOUNTANT only | Session 1 |
| Peer benchmarking (cohort comparison) | DEFERRED | Requires minimum cohort of 10 pharmacies with same tier; privacy constraints | Session 1 |
| AWaRe consumption reporting (aggregate antibiotics by class) | BACKLOG | AWaRe classification shipped; aggregate report for OWNER/PIC useful for TMDA stewardship | Apr 2026 |

---

## Financial & Billing

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Payment gateway — M-Pesa and Flutterwave for subscription billing | DEFERRED | Phase 2; manual payment by founder for Phase 1 | Session 1 |
| Automated subscription renewal and suspension | DEFERRED | Phase 2; depends on payment gateway | Session 1 |
| VAT invoicing for wholesale (VFD-compliant) | DEFERRED | EFDMS Protocol 2.1 integration required first | Apr 2026 |
| NHIF reimbursement reconciliation | DEFERRED | Requires live NHIF claims module (Phase 2) | Session 1 |

---

## Patient-Facing

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Patient mobile app (refill requests, medication history) | PLACEHOLDER | Phase 3 — persistent patient data requires PDPC + MOH MOU | Session 1 |
| Patient WhatsApp bot (prescription reminders, refill alerts) | BACKLOG | Africa's Talking wired; requires opt-in framework and persistent patient identity | Session 1 |

---

## Infrastructure & Platform

| Feature | Status | Blocker / Dependency | Agreed |
|---|---|---|---|
| Master drug catalog (Phase 2–8 of patient-safety-tanzania-master-data.md) | DEFERRED | Phase 1 source discovery must complete first; see tasks/patient-safety-tanzania-master-data.md | Apr 2026 |
| Shared network barcode catalog — frontend "Share to network" toggle on barcode mapping save | SCHEMA READY | Backend schema + lookup logic shipped (sharedToNetwork field + NETWORK tier in lookupBarcodeForReceiving); frontend needs a toggle on the barcode-mapping save UI visible to OWNER/PIC only; onboarding flow for wholesale pharmacies should default to shared=true | Apr 2026 |
| Testing suite — Vitest + Supertest, ≥80% coverage | DEFERRED | CODEX_TASKS.md Task 13; should be written alongside each module, not after | Session 1 |
| Offline-first sync engine (full conflict resolution) | DEFERRED | CODEX_TASKS.md Task 3; SyncConflict table exists; resolution logic incomplete | Session 1 |
| Multi-tenant pharmacy chain management (franchisor dashboard) | BACKLOG | ENTERPRISE tier; depends on multi-outlet inventory A15/A16 | Session 1 |
| Data export for PDPC compliance (right to access, right to erasure) | BACKLOG | Required by Tanzania Data Protection Act 2022; no specific deadline set | Apr 2026 |
| Demo account removal | DEFERRED | Must be done before final production launch; currently intentional per CLAUDE.md | Session 1 |

---

## Phase Roadmap Summary

| Phase | Features | Gate condition |
|---|---|---|
| Phase 1 (live) | Dashboard, Inventory, Compliance, Analytics, Dispensing, Knowledge Hub, Wholesale basics | — |
| Phase 2 | CPD Tracker, NHIF Claims, Stock Exchange, Payment Gateway, Forecasting (full), ADR Reporting (full), Dispensing daily close, Wholesale gaps (C–F) | NHIF accreditation, payment gateway contract, Phase 1 stable |
| Phase 3 | B2B Platform, Patient App, Multi-outlet ENTERPRISE, Persistent Patient Records | PDPC registration, MOH MOU, B2B network critical mass |
| Phase 4 | AI Safety module, Data Products, Regional Analytics | Clinical governance policy, data partnership agreements |

---

## Shipped

| Feature | Shipped date | Notes |
|---|---|---|
| AWaRe antibiotic classification (field + dispensing flag) | Apr 2026 | Full NEMLIT 2021 classification; WATCH and RESERVE badges in dispensing |
| Cold chain log schema | Apr 2026 | Migration only; UI/API deferred to Phase 2 |
| Pharmacovigilance ADR schema + placeholder page | Apr 2026 | Schema ready; full form deferred pending TMDA integration |
| Forecasting early-preview banner | Apr 2026 | Clearly labels stub data as indicative |
| Analytics overview endpoint normalisation | Apr 2026 | Frontend now reads real /analytics/overview data |
| Subscription pricing update (ADDO 20k, Essential 35k, Standard 55k, Premium 75k, Wholesale 100k, Enterprise custom; annual billing 10x monthly) | May 2026 | Current pricing matrix |
| CPD Tracker moved to Phase 2 Coming Soon | Apr 2026 | Removed from Phase 1 active nav |
| TMDA Controlled Substances Reporting placeholder | Apr 2026 | Deferred page with waitlist capture |
| Unsubscribe token route (/unsubscribe/:token) | Apr 2026 | Knowledge Hub email unsubscribe |
| Team management endpoint fix | Apr 2026 | Corrected to /settings/team endpoints |
| Deferred feature "Back to platform" link fix | Apr 2026 | Was pointing to /login, now /dashboard |
| Sync Conflicts moved to Phase 1 nav | Apr 2026 | Was incorrectly in Coming Soon section |
| PPB → PC (Pharmacy Council) correction across all files | Apr 2026 | Systematic replacement throughout codebase and docs |
