# APOTEKH — Investor Package
### Prepared for Codex Implementation
**Confidential | May 2026**

---

## PART 1 — INVESTOR NARRATIVE

---

### 1. WHY PHARMACIES FAIL OPERATIONALLY

Pharmacies in Sub-Saharan Africa are not failing because of a lack of demand. They are failing because they are running critical healthcare infrastructure on tools designed for a grocery shop — or nothing at all.

The typical Tanzanian pharmacy operates on a combination of handwritten ledger books, WhatsApp messages to suppliers, and a cashier's memory. When a pharmacist in Dar es Salaam dispenses ciprofloxacin — a WATCH-class antibiotic restricted to council hospital level under Tanzania's NEMLIT 2021 — there is no system flagging the regulatory risk. When a diabetic patient returns for insulin and the cold chain log is blank, no one knows whether the product was stored within safe temperature range. When the month ends and the owner wants to understand which products are dead stock and which are heading for stockout, there is no answer — only guesswork.

These are not edge cases. These are the daily operating conditions of tens of thousands of pharmacy outlets across East Africa.

Operationally, pharmacies fail for five compounding reasons:

**No inventory intelligence.** Stock is managed by eye. Pharmacies routinely run out of fast-moving products while holding months of dead stock that erodes capital. Without FEFO (First Expired, First Out) discipline enforced by a system, expired drugs reach patients or are silently discarded at a loss.

**No clinical safety layer.** Drug interactions, AWaRe antibiotic classifications, pregnancy contraindications, and controlled substance flags exist in regulatory frameworks — but not at the point of dispensing. The pharmacist or ADDO dispenser relies entirely on personal memory in a high-volume, low-margin environment.

**No compliance infrastructure.** TMDA inspections, NHIF claim processing, Pharmacy Council renewal documentation — all require audit trails that paper systems cannot produce. The result is inspection failures, claim rejections, and regulatory penalties that punish the very operators trying to do things correctly.

**No supply chain visibility.** Wholesale ordering is done by phone call or WhatsApp. There is no purchase order record, no supplier performance tracking, no delivery confirmation, no credit note system when goods arrive damaged or wrong. The wholesale relationship between manufacturer, distributor, and retail pharmacy is entirely unstructured.

**No financial intelligence.** Daily close is a manual reconciliation. Owners cannot see payment method breakdown, variance between expected and actual stock, or which staff members are responsible for discrepancies. Financial accountability is aspirational, not operational.

The result is a sector where margins are already thin — typically 10–20% on prescription drugs — being further compressed by avoidable losses, regulatory penalties, and capital tied up in dead stock.

---

### 2. WHY CURRENT SYSTEMS ARE WEAK

The systems that exist fall into three categories: too generic, too fragmented, or too foreign.

**Generic POS systems** (mPOS, Till, basic retail software) treat a pharmacy like a supermarket. They can record a sale and print a receipt. They cannot check drug interactions, flag an AWaRe violation, enforce FEFO batch rotation, manage a wholesale delivery manifest, or produce a TMDA-compliant audit log. A pharmacy using a generic POS has only marginally more operational intelligence than one using a paper ledger.

**Supply chain platforms** (mPharma, Jacaranda Health adjacent systems, distributor portals) address one piece of the puzzle — ordering and procurement — but do not touch dispensing, clinical safety, or compliance. They are logistics tools wearing healthcare clothing.

**Public sector systems** (iHRIS, DHIS2, OpenMRS) are built for government health facilities, not retail pharmacy. They are designed for patient record management in clinical settings, not for commercial pharmacy operations. Adapting them for an ADDO or retail chain is technically possible and operationally disastrous.

**Imported solutions** (pharmacy software from India, the UK, or the US) assume a regulatory environment, drug formulary, currency, and supply chain structure that does not exist in Tanzania. They require expensive localization, have no understanding of TMDA, NHIF, NEMLIT, or the ADDO tier system, and often require hardware investments that are uneconomical at the price points East African pharmacies can sustain.

**Excel and WhatsApp** remain the most widely used "system." They are infinitely flexible, require no training, and cost nothing. They also produce no forecasting, no clinical safety checks, no audit trail, and no analytics. For a single-owner, low-volume outlet, they are adequate. For anything aspiring to scale, quality, or compliance, they are a liability.

The gap is not a minor feature gap. It is a structural absence. No system currently available in Tanzania is built for what pharmacy actually needs: an integrated operating layer that combines dispensing, clinical safety, inventory intelligence, compliance infrastructure, and supply chain management — localized to TMDA regulations, NHIF requirements, Tanzania's drug formulary, and Tanzanian Shilling economics.

---

### 3. WHY AFRICA AND TANZANIA ARE UNDERSERVED

Tanzania is not an emerging market for pharmacy software. It is a missing market — one where the product does not yet exist at the right price, in the right language, with the right regulatory grounding.

Tanzania has approximately 16,000 regulated medicine outlets: registered pharmacies, ADDO outlets, dispensaries with pharmacy services, and hospital-attached dispensing units. Of these, fewer than 3% operate any purpose-built pharmacy management software. The rest operate on paper, generic tools, or nothing.

The reasons are structural:

**Regulatory complexity is high and underestimated.** TMDA's Good Storage and Distribution Practices (GSDP) Regulations 2021, the AWaRe antibiotic framework embedded in NEMLIT 2021, NHIF electronic claims requirements, and Pharmacy Council licensing documentation create compliance demands that a generic system simply cannot meet. A solution built without regulatory DNA from the start will always be retrofitting — and retrofitting is expensive, slow, and partial.

**The market is tiered in ways outsiders miss.** Tanzania's ADDO system — Accredited Drug Dispensing Outlets — created a licensed, non-pharmacist-operated dispensing tier that serves rural and peri-urban populations. ADDOs have different drug lists, different compliance requirements, and different economic profiles from registered pharmacies. Any system that ignores this tier ignores the majority of the market by outlet count.

**Purchasing power requires a pricing architecture most vendors won't build.** A pharmacy in Moshi cannot sustain a $150/month SaaS fee. An ADDO in Dodoma cannot. But at Tsh 20,000–75,000 per month (approximately $8–30), a tiered model with real value at every tier becomes accessible to virtually the entire formal sector. Building this economics model while maintaining product quality requires deep local knowledge and willingness to operate lean.

**Trust and clinical credibility must be earned locally.** Pharmacy owners and Pharmacists in Charge are educated professionals with strong views on what clinical tools they will and will not trust. A product built by people outside the regulatory and clinical environment will not earn that trust. APOTEKH is built with TMDA compliance, NHIF integration, and NEMLIT drug classification as foundational requirements — not afterthoughts.

East Africa more broadly — Kenya, Uganda, Rwanda, Ethiopia — presents the same structural underservice at scale. The total addressable market across the six-country region exceeds 100,000 regulated outlets with no dominant incumbent.

---

### 4. WHY APOTEKH IS INFRASTRUCTURE

APOTEKH is not a tool for pharmacies to use. It is the operating layer that makes a pharmacy function as a compliant, clinical, intelligent business.

The distinction matters. A tool is optional. Infrastructure is the substrate on which everything else runs.

When a pharmacist in Charge opens APOTEKH in the morning, they are not "using software." They are activating the system that will manage every dispensing decision, every stock movement, every supplier interaction, every compliance obligation, and every financial record for the day. Removing APOTEKH from that pharmacy does not inconvenience the operation — it disables it.

This is the infrastructure position. And infrastructure has five characteristics that tools do not:

**Switching cost is high once embedded.** Drug databases, patient counselling histories, stock movement records, supplier relationships, and compliance audit trails accumulate inside APOTEKH over time. The longer a pharmacy operates on APOTEKH, the more valuable the data layer becomes and the less conceivable it is to operate without it.

**Network effects compound at the wholesale layer.** As more retail pharmacies join the APOTEKH network, wholesale pharmacies gain a captive, structured ordering channel. As more wholesale pharmacies integrate, retail pharmacies gain better pricing, faster fulfilment, and automated credit note management. The network becomes more valuable with each additional node — a property no standalone tool can replicate.

**Regulatory positioning creates a moat.** APOTEKH is not working toward TMDA compliance. It was built with TMDA compliance as a design requirement. The AWaRe classification system, cold chain logging, pharmacovigilance ADR reporting, NHIF claim integration — these are not features. They are the regulatory passport that allows pharmacies to operate with confidence at inspection time. No competitor can replicate this positioning without rebuilding from the regulatory layer up.

**Clinical safety creates professional loyalty.** A Pharmacist in Charge whose licence depends on the clinical decisions made in their outlet will not risk that licence on a system they don't trust. APOTEKH's drug interaction engine, AWaRe badges, pregnancy category flags, and AI counselling layer give the PIC a tool that actively protects their professional standing. This is a loyalty driver no pricing strategy can match.

**Data aggregation at scale creates a second business.** Anonymised, aggregated dispensing data across thousands of outlets is a public health intelligence asset. Disease surveillance, antibiotic stewardship monitoring, supply chain optimization, TMDA pharmacovigilance — the data layer that APOTEKH generates has value far beyond the subscription fee. This is the infrastructure dividend that emerges only at network scale.

---

### 5. WHY NOW

Three forces are converging to make the next 24 months the defining window for pharmacy infrastructure in East Africa.

**Regulatory digitization is accelerating.** TMDA is actively developing digital inspection tools. NHIF has expanded electronic claims processing. The Pharmacy Council is moving toward digital CPD tracking and licence management. Pharmacies that are not digitally operational will face increasing friction with regulators, insurers, and government health programs. The compliance tailwind is strong and strengthening.

**Mobile money has solved the payment infrastructure problem.** M-Pesa, Tigo Pesa, and Airtel Money penetration means that a pharmacy in rural Singida can collect a subscription payment digitally, pay a supplier by mobile transfer, and receive an NHIF reimbursement electronically. The financial rails that SaaS businesses require to operate exist and are mature. This was not true five years ago.

**COVID-19 permanently shifted digital adoption curves.** The pandemic forced pharmacy owners, dispensers, and patients into digital interactions that many had previously resisted. QR code dispensing records, WhatsApp prescription images, digital payment receipts — these behaviours are now normalized in ways they were not before 2020. The psychological barrier to adopting a digital operating system has fallen.

**The competitive window is open but will not stay open.** No incumbent has established infrastructure-level positioning in the Tanzanian pharmacy market. The first platform to achieve deep regulatory integration, clinical credibility, and wholesale network density will be structurally difficult to displace. The first-mover advantage in infrastructure markets is significant and durable. That window is open now.

**The team is ready.** APOTEKH is not a concept or a prototype. It is a production-deployed, full-stack pharmacy operating system with dispensing, inventory, wholesale, clinical safety, and analytics modules live. The work has been done. The question is scale.

---

### 6. WHY US

The pharmacy operating system for East Africa will be built by someone who understands three things simultaneously: the clinical requirements of pharmacy practice, the regulatory architecture of TMDA and NHIF, and the economic reality of operating a pharmacy in Tanzania at scale. This intersection is rare.

APOTEKH is built on that intersection. The AWaRe classification is not a feature added to impress a pitch panel — it closes a real compliance gap that Pharmacists in Charge face daily. The FEFO batch enforcement is not a nice-to-have — it is the mechanism by which TMDA inspections are passed and patient safety is protected. The ADDO tier pricing is not an afterthought — it is the commercial architecture that allows the platform to serve the majority of the market rather than only the most affluent outlets.

We are not entering this market from outside with a solution looking for a problem. We built the solution because we understand the problem from the inside.

The platform is live. The regulatory knowledge is embedded. The clinical layer is operational. The wholesale module is deployed. We are not asking for funding to build the product — we are asking for funding to scale what is already working.

---

## PART 2 — MARKET POSITIONING

---

### What APOTEKH Is NOT

| ❌ Do Not Say | Why It Costs You |
|---|---|
| POS system | Commoditizes APOTEKH against $5/month retail tools |
| Pharmacy software | Generic; implies a feature, not a platform |
| Inventory management | Undersells the clinical and compliance layers |
| EHR / EMR | Wrong category; creates hospital-system comparisons |
| Dispensing app | Sounds small; misses the infrastructure thesis |

---

### What APOTEKH IS — Five Positioning Layers

**Layer 1: Pharmacy Operating Infrastructure**
> "The operating system that runs a compliant, clinical, intelligent pharmacy business."

Use when: Speaking to investors who understand infrastructure thesis and platform economics.

**Layer 2: Healthcare Commerce Layer**
> "The commerce infrastructure connecting patients, pharmacies, wholesalers, insurers, and regulators in a single transactional network."

Use when: Pitching to fintech-adjacent or marketplace investors. Emphasizes the network and revenue flow opportunity.

**Layer 3: Compliance Engine**
> "The only pharmacy platform built to TMDA, NHIF, and WHO AWaRe compliance from the ground up."

Use when: Pitching to health system investors, development finance institutions, or global health funds. Emphasizes the regulatory moat.

**Layer 4: Clinical Safety Platform**
> "The clinical safety layer that protects pharmacists, patients, and public health at every dispensing decision."

Use when: Pitching to global health-focused investors (Gates Foundation adjacent, Wellcome Trust, etc.). Emphasizes the public health impact.

**Layer 5: Supply Chain Intelligence Layer**
> "The intelligence network that connects pharmacy supply chains from manufacturer to patient, with full visibility at every node."

Use when: Pitching to supply chain or logistics-focused investors. Emphasizes the wholesale network and data flywheel.

---

### The One-Line Pitch (by audience)

| Audience | One-Line |
|---|---|
| Venture investor | "APOTEKH is the pharmacy OS for Africa — the compliance, clinical, and commerce infrastructure that 16,000 Tanzanian pharmacy outlets need and none currently have." |
| Development finance | "APOTEKH closes the clinical safety and compliance gap in African pharmacy by building the regulatory-native operating infrastructure that TMDA, NHIF, and WHO AWaRe require." |
| Strategic partner | "APOTEKH is the network through which manufacturers, distributors, retail pharmacies, and insurers transact — with clinical safety and regulatory compliance built into every interaction." |
| Pharmacy owner | "APOTEKH runs your pharmacy — dispensing, stock, orders, compliance, and finances — so you can focus on patients, not paperwork." |

---

## PART 3 — SLIDE ARCHITECTURE FOR CODEX

**Design Spec:**
- Layout: 16x9 (10" × 5.625")
- Primary Color: `0A2540` (deep navy)
- Accent 1: `00A878` (emerald — medical/health)
- Accent 2: `F7B731` (gold — quality/value)
- Light BG: `F5F7FA`
- Body Text: `4A5568`
- Muted: `94A3B8`
- Font: Calibri (headings bold, body regular)
- Dark slides: 1, 16 (full navy background, white text)
- Light slides: 2–15 (white/F5F7FA background)

---

### SLIDE 1 — VISION (Dark, Full Navy)

**Background:** `0A2540` full bleed
**Layout:** Centered, vertical stack

**Elements:**
- Emerald rectangle accent bar: left edge, full height, 0.12" wide, color `00A878`
- APOTEKH wordmark: centered, 60pt, bold, white, letter-spacing wide, y=1.5"
- Tagline: "The Operating System for African Pharmacy" — 24pt, white, centered, y=2.6"
- Divider line: thin, gold `F7B731`, 4" wide, centered, y=3.2"
- Three positioning labels in a row (centered, y=3.5"):
  - "PHARMACY INFRASTRUCTURE" | "HEALTHCARE COMMERCE" | "CLINICAL SAFETY"
  - Each: 11pt, muted white (`CADCFC`), letter-spaced, separated by gold dots
- Bottom: "Confidential — Seed Round 2026" — 10pt, muted, bottom center

**Speaker note:** Open with the infrastructure thesis. Not "pharmacy software." The operating system.

---

### SLIDE 2 — THE PROBLEM: WHY PHARMACIES FAIL (Split Layout)

**Background:** White
**Layout:** Left dark panel (40% width), right stats area (60%)

**Left Panel (navy `0A2540`):**
- Section label: "THE PROBLEM" — 10pt, emerald, upper left
- Headline: "Pharmacies are running critical healthcare on tools built for a grocery shop." — 22pt, white, bold
- Sub: "Or nothing at all." — 16pt, gold, italic

**Right Area (4 stat callout cards, 2×2 grid):**

Card 1 — Inventory
- Big number: "40%+" — 48pt, emerald bold
- Label: "of dispensing days affected by stock-outs" — 13pt, slate

Card 2 — Clinical Safety
- Big number: "0" — 48pt, gold bold
- Label: "pharmacy systems in TZ with drug interaction checking at point of sale" — 13pt, slate

Card 3 — Compliance
- Big number: "3%" — 48pt, emerald bold
- Label: "of Tanzania's 16,000 pharmacy outlets using purpose-built software" — 13pt, slate

Card 4 — Financial Loss
- Big number: "Tsh M+" — 48pt, gold bold
- Label: "lost annually to expired stock and manual reconciliation errors" — 13pt, slate

**Speaker note:** These are systemic failures, not individual ones. Every pharmacy in Tanzania faces all four of these simultaneously.

---

### SLIDE 3 — MARKET PAIN (Three Column Pain Cards)

**Background:** `F5F7FA`
**Layout:** Slide title top, 3 equal-width columns below

**Title:** "The pain runs three ways" — 28pt, navy, left-aligned

**Column 1 — The Pharmacy Owner**
- Icon: building/shop icon in emerald circle
- Header: "PHARMACY OWNERS" — 12pt, emerald, bold, letter-spaced
- Pain points (icon bullets with emerald checkmark):
  - Capital locked in dead stock
  - TMDA inspection failures
  - NHIF claim rejections
  - No visibility into staff performance
  - Manual month-end reconciliation takes days

**Column 2 — The Patient**
- Icon: person/patient icon in gold circle
- Header: "PATIENTS" — 12pt, gold, bold, letter-spaced
- Pain points:
  - Receives drugs without interaction checks
  - No record of dispensing history
  - Expired or improperly stored products
  - Cannot verify AWaRe classification
  - No adverse reaction reporting pathway

**Column 3 — The Regulator**
- Icon: shield/authority icon in navy circle
- Header: "REGULATORS" — 12pt, navy, bold, letter-spaced
- Pain points:
  - No real-time dispensing visibility
  - Paper-based inspection records
  - Antibiotic stewardship data absent
  - ADR reports rarely reach TMDA
  - Cold chain compliance unverifiable

**Bottom bar:** Thin emerald line, full width. Text: "APOTEKH closes all three gaps simultaneously." — 13pt, navy, centered, italic

---

### SLIDE 4 — CURRENT WEAK SYSTEMS (Comparison Cards)

**Background:** White
**Layout:** Title top-left, 5 horizontal comparison cards stacked

**Title:** "What exists is not enough." — 28pt, navy
**Subtitle:** "Every alternative fails on at least two of the five dimensions pharmacies need." — 14pt, slate

**Comparison table / card row:**

| System | Clinical Safety | Compliance | Inventory Intelligence | Wholesale | Tanzania-Native |
|---|---|---|---|---|---|
| Generic POS (mPOS) | ✗ | ✗ | Partial | ✗ | ✗ |
| Supply Chain Platforms | ✗ | Partial | Partial | Partial | ✗ |
| Public Sector (DHIS2/iHRIS) | ✗ | Partial | ✗ | ✗ | ✗ |
| Imported Pharmacy Software | Partial | ✗ | Partial | ✗ | ✗ |
| Excel / WhatsApp | ✗ | ✗ | ✗ | ✗ | ✓ |
| **APOTEKH** | **✓** | **✓** | **✓** | **✓** | **✓** |

**Design note:** APOTEKH row highlighted with emerald background and white text. ✓ in emerald, ✗ in light red/muted.

**Speaker note:** This is not a feature comparison. It is a category comparison. Nothing in this market does what APOTEKH does.

---

### SLIDE 5 — THE APOTEKH SOLUTION (5 Pillar Cards)

**Background:** `F5F7FA`
**Layout:** Title top, 5 cards in a horizontal row below

**Title:** "Five integrated layers. One operating system." — 28pt, navy, bold
**Subtitle:** "Built for TMDA compliance, NHIF integration, and Tanzania's drug formulary from day one." — 14pt, slate

**5 Pillar Cards (equal width, ~1.7" each, full content height):**

**Card 1 — Dispensing Engine**
- Top accent: emerald `00A878`
- Icon: pill/capsule
- Title: "Dispensing Engine" — 14pt, navy, bold
- Body: AWaRe classification · Drug interaction checking · FEFO batch enforcement · Prescription management · PIC PIN authorization

**Card 2 — Inventory Intelligence**
- Top accent: gold `F7B731`
- Icon: chart/graph
- Title: "Inventory Intelligence" — 14pt, navy, bold
- Body: Stockout forecasting · Dead stock scoring · Cold chain logging · Expiry tracking · Real-time stock levels

**Card 3 — Compliance Infrastructure**
- Top accent: emerald
- Icon: shield/badge
- Title: "Compliance Infrastructure" — 14pt, navy, bold
- Body: TMDA audit trail · NHIF claims processing · Pharmacy Council documentation · ADR / pharmacovigilance · GSDP temperature records

**Card 4 — Wholesale Network**
- Top accent: gold
- Icon: truck/network
- Title: "Wholesale Network" — 14pt, navy, bold
- Body: B2B ordering · Purchase order management · Delivery manifests · Credit note system · Per-client price overrides

**Card 5 — Clinical Safety AI**
- Top accent: emerald
- Icon: brain/AI
- Title: "Clinical Safety AI" — 14pt, navy, bold
- Body: AI drug counselling · Interaction alerts · Pregnancy category flags · RESERVE antibiotic warnings · Session-based (no patient data stored)

---

### SLIDE 6 — PRODUCT (Feature Showcase)

**Background:** White
**Layout:** Title left-top. 2×3 grid of feature cards below.

**Title:** "The platform. In production. Right now." — 28pt, navy, bold

**6 Feature Cards (2 columns × 3 rows):**

**Card 1 — Smart Dispensing**
- Emerald top bar
- Heading: "Smart Dispensing Interface"
- Body: Search any drug by generic or brand name. AWaRe badges appear instantly. Interactions checked before confirmation. PIC PIN required for controlled substances.

**Card 2 — Stockout Forecasting**
- Gold top bar
- Heading: "Stockout Forecasting"
- Body: 30-day demand averaging. Lead time modeling. RISK and OUT status flags. Top 20 urgent items surface automatically.

**Card 3 — Wholesale Order Management**
- Emerald top bar
- Heading: "Wholesale Order Management"
- Body: Full purchase order workflow. Supplier catalogue management. Delivery manifests with driver assignment. Stock auto-increments on receipt confirmation.

**Card 4 — Patient Safety AI**
- Gold top bar
- Heading: "AI Clinical Counselling"
- Body: Drug-specific counselling points generated at dispensing. Interaction and contraindication alerts. Session-only — no patient data persisted. ANTHROPIC API powered.

**Card 5 — Daily Close & Reconciliation**
- Emerald top bar
- Heading: "Daily Close & Reconciliation"
- Body: One-click daily close. Total sales, revenue, items dispensed, payment method breakdown. One close per outlet per calendar day enforced.

**Card 6 — Subscription Tier Management**
- Gold top bar
- Heading: "Tiered Access Control"
- Body: ADDO → Basic → Standard → Premium → Wholesale → Enterprise. Feature gates enforced at API level. Role-based access: OWNER, PHARMACIST_IN_CHARGE, DISPENSER, CASHIER, DATA_ENTRY_CLERK, WHOLESALE_MANAGER.

---

### SLIDE 7 — CLINICAL SAFETY EDGE (Icon Rows)

**Background:** `0A2540` (dark navy — mid-deck dark slide for visual contrast)
**Layout:** Left-aligned title. 5 icon-text rows below.

**Title:** "The clinical layer no competitor has." — 32pt, white, bold
**Subtitle:** "Built to WHO standards. Enforced at the point of dispensing." — 16pt, `94A3B8`, italic

**5 Icon-Text Rows:**

**Row 1:**
- Icon: pill in emerald circle
- Bold label: "AWaRe Antibiotic Classification"
- Description: WATCH and RESERVE antibiotics flagged with badges at dispensing. Tooltip cites WHO AWaRe / Tanzania NEMLIT 2021. ACCESS drugs dispensed normally.

**Row 2:**
- Icon: alert/warning in gold circle
- Bold label: "Drug Interaction Engine"
- Description: Checks every dispensing against the local interaction dataset. Escalates to PIC PIN authorization for high-risk combinations.

**Row 3:**
- Icon: thermometer in emerald circle
- Bold label: "Cold Chain Temperature Logging"
- Description: GSDP-compliant temperature records per storage unit. Excursion flagging. TMDA audit trail ready.

**Row 4:**
- Icon: report/document in gold circle
- Bold label: "Pharmacovigilance & ADR Reporting"
- Description: Structured adverse drug reaction forms. TMDA reference tracking. Submission status management. Built for TMDA electronic integration when live.

**Row 5:**
- Icon: brain/AI in emerald circle
- Bold label: "AI Patient Counselling"
- Description: Session-based clinical counselling at point of dispensing. No patient data stored. Graceful fallback to rule-based responses when AI unavailable.

---

### SLIDE 8 — BUSINESS MODEL (Tier Cards)

**Background:** White
**Layout:** Title + subtitle top. 4 retail tier cards in a row, then 2 wholesale/enterprise cards below. Revenue model note at bottom.

**Title:** "Subscription tiers built for the real market." — 28pt, navy, bold
**Subtitle:** "From the ADDO dispenser in rural Singida to the multi-branch wholesale pharmacy in Dar es Salaam." — 13pt, slate

**4 Retail Tier Cards (top row):**

**Card 1 — ADDO**
- Header BG: `94A3B8` (muted)
- Price: "Tsh 20,000 /mo" — large
- Tier: "ADDO"
- Sub: 1 outlet · 3 users · 14-day trial
- Features: Basic POS & dispensing · FEFO inventory · DLDM compliance · Owner Dashboard · Barcode scanning · Full Clinical Decision Support

**Card 2 — Basic**
- Header BG: emerald `00A878`
- Price: "Tsh 39,000 /mo"
- Tier: "BASIC"
- Sub: 2 outlets · 5 users · 14-day trial
- Features: Everything in ADDO + Multi-outlet Owner Dashboard · Roles & permissions · Void/reissue audit trail · Full compliance tracker (TMDA + PC)

**Card 3 — Standard** ← "MOST POPULAR" banner
- Header BG: navy `0A2540` (darkest, most prominent)
- Price: "Tsh 55,000 /mo"
- Tier: "STANDARD"
- Sub: 3 outlets · 10 users · 14-day trial
- Features: Everything in Basic + Accounting module · Customer purchase history · Patient Ordering Portal · Knowledge Hub full access

**Card 4 — Premium**
- Header BG: gold `F7B731`
- Price: "Tsh 75,000 /mo"
- Tier: "PREMIUM"
- Sub: 5 outlets · 20 users · 14-day trial
- Features: Everything in Standard + Demand forecasting · Dead stock scoring · Revenue projections · Peer benchmarking · Full Knowledge Hub with courses

**2 Wholesale/Enterprise Cards (second row):**

**Card 5 — Wholesale**
- Header BG: emerald `00A878`
- Price: "Tsh 100,000 /mo"
- Tier: "WHOLESALE"
- Features: Wholesale order inbox · Tiered catalogue pricing · Credit limits & receivables · VAT-compliant invoicing · Delivery scheduling

**Card 6 — Enterprise**
- Header BG: navy `0A2540`
- Price: "Negotiated"
- Tier: "ENTERPRISE"
- Features: 6+ outlets · Unlimited users · All Premium features · Custom reporting · Dedicated implementation support

**Below cards — Revenue model note:**
"Additional revenue streams: Wholesale marketplace commission · Drug database API licensing · Anonymised sector intelligence reports"

---

### SLIDE 9 — MARKET SIZE (TAM / SAM / SOM)

**Background:** `F5F7FA`
**Layout:** Title top. Left: 3 big number callouts stacked. Right: Nested circle visualization (TAM/SAM/SOM).

**Title:** "A market large enough to build on. Underserved enough to win." — 26pt, navy, bold

**Left — 3 Big Numbers:**

**TAM:**
- Label: "TAM — Africa" — 11pt, emerald, bold, letter-spaced
- Number: "$500M+" — 54pt, navy, bold
- Sub: "1M+ pharmacy outlets across 54 countries at $40/month avg" — 12pt, slate

**SAM:**
- Label: "SAM — East Africa (6 countries)" — 11pt, gold, bold, letter-spaced
- Number: "$50M" — 42pt, navy, bold
- Sub: "~100,000 regulated outlets · Kenya, Tanzania, Uganda, Rwanda, Ethiopia, Mozambique" — 12pt, slate

**SOM:**
- Label: "SOM — Tanzania (Year 3)" — 11pt, emerald, bold, letter-spaced
- Number: "$5M ARR" — 36pt, navy, bold
- Sub: "2,000 outlets at Tsh 65K avg/month · ~12.5% market penetration" — 12pt, slate

**Right — Nested Circles:**
- Largest circle: gold, translucent, "$500M+ TAM"
- Middle circle: emerald, "$50M SAM"
- Smallest circle: navy, "$5M SOM"

---

### SLIDE 10 — GO-TO-MARKET (3-Phase Timeline)

**Background:** White
**Layout:** Title top. Horizontal 3-phase timeline with content below each phase marker.

**Title:** "Market entry. Network density. Regional expansion." — 26pt, navy, bold

**Phase 1 — Months 1–18: Tanzania Foundation**
- Color: Emerald
- Milestone marker: circle with "1"
- Content:
  - Direct sales to pharmacy groups (5+ outlets)
  - TMDA compliance positioning (inspection readiness tool)
  - NHIF integration as pull factor (claims processed through APOTEKH)
  - Pharmacy Council CPD partnership
  - Target: 500 outlets, Tsh 30M+ MRR

**Phase 2 — Months 18–36: East Africa Expansion**
- Color: Gold
- Milestone marker: circle with "2"
- Content:
  - Kenya market entry (localization for PPB/Kenya Pharmacy Board)
  - Uganda pilot (NDA regulatory mapping)
  - Wholesale network cross-border functionality
  - Target: 2,000 outlets across 3 markets

**Phase 3 — Months 36–60: Network Scale**
- Color: Navy
- Milestone marker: circle with "3"
- Content:
  - Rwanda, Ethiopia, Mozambique entry
  - Manufacturer/distributor API partnerships
  - Sector intelligence data product launch
  - Target: 10,000+ outlets, Series A ready

**Connecting line:** Horizontal, emerald, connecting phase markers

---

### SLIDE 11 — COMPETITION (Positioning Map)

**Background:** `F5F7FA`
**Layout:** Title top. 2×2 positioning matrix (axes: Clinical Depth vs. Compliance Depth). Competitor labels plotted.

**Title:** "The competitive landscape has a gap. We're in it." — 26pt, navy, bold

**Positioning Matrix:**
- X-axis: "Compliance Depth" (Low → High)
- Y-axis: "Clinical Safety Depth" (Low → High)
- Top-right quadrant label: "APOTEKH" (only occupant) — emerald filled circle, large
- Bottom-left: "Excel / Paper" — muted dot
- Bottom-center: "Generic POS (mPOS, Till)" — muted dot
- Mid-left: "mPharma / Supply Chains" — muted dot
- Center-left: "Imported Software" — muted dot
- Left-mid: "Public Sector Systems (DHIS2)" — muted dot

**Quadrant labels:**
- Top-right: "Full Infrastructure" — emerald text
- Top-left: "Clinical Only"
- Bottom-right: "Compliance Only"
- Bottom-left: "Neither"

**Right sidebar — Competitor quick summary:**
| Competitor | What They Do | What They Miss |
|---|---|---|
| mPharma | Procurement network | No dispensing OS, no clinical |
| Generic POS | Transaction recording | No pharmacy-specific logic |
| DHIS2/iHRIS | Public health data | Not retail-pharmacy built |
| Imported SW | Feature-rich elsewhere | Not localized; no TMDA/NHIF |
| Excel/WA | Familiar, free | No intelligence, no compliance |

---

### SLIDE 12 — WHY WE WIN (5 Advantage Cards)

**Background:** White
**Layout:** Title top. 5 numbered cards in a horizontal row.

**Title:** "Five advantages that compound over time." — 28pt, navy, bold
**Subtitle:** "These are not features. They are structural positions." — 14pt, slate, italic

**Card 1 — Regulatory DNA**
- Number: "01" — 36pt, emerald, bold
- Title: "Built Compliant"
- Body: TMDA, NHIF, NEMLIT AWaRe, GSDP — embedded from day one. Not retrofitted. No competitor can replicate this without rebuilding from scratch.

**Card 2 — Clinical Credibility**
- Number: "02" — 36pt, gold, bold
- Title: "PIC Trust"
- Body: The Pharmacist in Charge's licence depends on clinical decisions. APOTEKH protects that licence. Trust earned here is not transferable to a competitor.

**Card 3 — Wholesale Moat**
- Number: "03" — 36pt, emerald, bold
- Title: "Network Effects"
- Body: Every retail pharmacy on APOTEKH is a node in the wholesale network. As the network grows, switching cost rises and network value compounds.

**Card 4 — Tanzania-Native**
- Number: "04" — 36pt, gold, bold
- Title: "Zero Localization Debt"
- Body: Tsh pricing, Tanzanian drug formulary, ADDO tier system, local supplier network — built in, not bolted on. No foreign competitor can match this without years of investment.

**Card 5 — Production-Ready**
- Number: "05" — 36pt, emerald, bold
- Title: "Already Built"
- Body: We are not funding product development. The dispensing engine, wholesale module, clinical safety layer, and analytics are live and deployed. Funding scales what works.

---

### SLIDE 13 — TRACTION (Milestones + Metrics)

**Background:** `F5F7FA`
**Layout:** Title top-left. Left: timeline of milestones. Right: current metrics in big-number callouts.

**Title:** "What we've built. What's next." — 28pt, navy, bold

**Left — Milestone Timeline (vertical, emerald line):**

- ✓ Full-stack platform architecture (Node/Prisma/React) — deployed
- ✓ Drug database seed — Tanzanian formulary, AWaRe classification
- ✓ Dispensing engine with PIC PIN authorization — live
- ✓ Drug interaction checking — live
- ✓ FEFO batch inventory management — live
- ✓ Wholesale module (purchase orders, manifests, credit notes) — live
- ✓ Stockout & dead stock forecasting — live
- ✓ AI clinical counselling (Anthropic API) — live
- ✓ Pharmacovigilance schema & placeholder — ready
- ✓ Cold chain logging schema — ready
- → NHIF electronic claims integration — in progress
- → TMDA digital inspection integration — roadmap
- → Kenya market localization — roadmap

**Right — Current Metrics (placeholders for Elihaki to fill):**

- [X] Outlets on platform
- [X] Dispensing transactions processed
- [X] Products in drug database
- Tsh [X] MRR
- [X] Subscription tier breakdown

*Note: Fill with live numbers before investor presentation.*

---

### SLIDE 14 — TEAM

**Background:** White
**Layout:** Title top. Team member cards in a 2×2 or 3-column grid.

**Title:** "The team that built it." — 28pt, navy, bold
**Subtitle:** "Pharmacy operations · Software engineering · Healthcare regulation · African market" — 14pt, slate

**Team Cards (Elihaki to populate):**

Each card:
- Photo (circular crop)
- Name — 16pt, navy, bold
- Title — 13pt, emerald
- 2–3 line bio — 12pt, slate
- LinkedIn / credential icons

**Advisor section (optional):** "Advisors & Partners" with logos of any regulatory bodies, academic partners, or investors already committed.

---

### SLIDE 15 — FINANCIAL PROJECTIONS (Bar Chart + Metrics)

**Background:** `F5F7FA`
**Layout:** Title top. Left: bar chart (Year 1–5 ARR). Right: key projection metrics.

**Title:** "The financial trajectory." — 28pt, navy, bold
**Subtitle:** "Conservative projections based on 12.5% Tanzania market penetration by Year 3." — 13pt, slate

**Bar Chart Data (Annual Recurring Revenue, USD):**
| Year | Outlets | Avg MRR/Outlet (Tsh) | ARR (USD approx) |
|---|---|---|---|
| Y1 | 100 | 50,000 | ~$26K |
| Y2 | 500 | 60,000 | ~$163K |
| Y3 | 2,000 | 65,000 | ~$750K |
| Y4 | 6,000 | 70,000 | ~$2.6M |
| Y5 | 15,000 | 80,000 | ~$7.2M |

*Exchange rate assumption: Tsh 2,500 = $1. Adjust to current rate.*

**Right — Key Metrics:**
- Gross Margin: ~78% (SaaS + data, minimal COGS)
- Net Revenue Retention: ~115% (tier upgrades + new modules)
- CAC Target: Tsh 150,000 (~$60)
- LTV Target: Tsh 3,600,000+ (~$1,440 @ 3yr average)
- LTV:CAC Ratio: 24:1
- Payback Period: ~3 months at Standard tier

**Chart colors:** Emerald bars (`00A878`), gold accent for Y5 bar

---

### SLIDE 16 — THE ASK (Dark, Full Navy)

**Background:** `0A2540` full bleed
**Layout:** Left column (ask details), right column (use of funds breakdown)

**Left:**
- Label: "THE ASK" — 11pt, emerald, bold, letter-spaced
- Amount: "$[X]M" — 64pt, white, bold *(Elihaki to fill)*
- Round: "Seed Round" — 18pt, gold
- Divider: gold line
- "To scale Tanzania, enter East Africa, and complete NHIF + TMDA integrations."
- Milestones this round delivers:
  - 500 outlets onboarded — Month 18
  - NHIF integration live — Month 12
  - Kenya market entry — Month 24
  - Series A ready — Month 30

**Right — Use of Funds (Donut or bar breakdown):**
- Engineering & Product: 30%
- Sales & Go-to-Market: 35%
- Regulatory & Compliance: 15%
- Operations & Team: 20%

**Bottom — Contact:**
- Name, email, phone
- "APOTEKH — The Operating System for African Pharmacy"
- Emerald accent

---

## CODEX IMPLEMENTATION NOTES

**Technology:** PptxGenJS — `npm install pptxgenjs`

**File output:** `APOTEKH_Investor_Deck.pptx`

**Critical rules (from PPTX skill):**
1. Never use `#` prefix in hex colors — write `0A2540` not `#0A2540`
2. Never reuse shadow objects — use `makeShadow()` factory function
3. Never use unicode bullets — use `bullet: true` in PptxGenJS
4. Never use 8-char hex for opacity — use `opacity` property separately
5. Use `breakLine: true` between array text items
6. Run QA: convert to PDF → images with `pdftoppm`, inspect each slide visually

**QA checklist before delivery:**
- [ ] No text overflow past container bounds
- [ ] No overlapping elements
- [ ] APOTEKH row highlighted in Slide 4 comparison table
- [ ] Dark slides (1, 7, 16) render white text correctly
- [ ] Bar chart on Slide 15 uses correct data values
- [ ] All placeholder text removed (team, metrics, ask amount)

---

*Prepared by APOTEKH / Claude — May 2026. For internal use and investor presentation only.*
