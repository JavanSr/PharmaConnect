# CLAUDE.md — PharmaConnect (Production + Safe Improvement Mode)

## Companion Repo Instructions
This repository also includes `AGENTS.md` for execution workflow guidance.

Use `CLAUDE.md` for:
- product direction
- architecture constraints
- privacy/security rules
- scope and priorities

Use `AGENTS.md` for:
- implementation workflow
- safe editing behavior
- validation and task execution rules

If there is any conflict, `CLAUDE.md` takes priority.

## IMPORTANT CONTEXT

This project is NOT starting from scratch.

A working Phase 1 system already exists.

Claude MUST:
- improve the current system
- NOT rebuild from zero
- NOT introduce breaking architectural changes

---

## SOURCE OF TRUTH

Derived from:
- PharmaConnect TOR / SRS v1.1 Revised (April 2026)
- PharmaConnect Product Roadmap v2.2

Claude MUST treat these as authoritative.

---

# 🧭 PRODUCT DEFINITION

PharmaConnect is:
A pharmacy-side operating system for Tanzania and East Africa.

It is NOT:
- a generic POS
- a demo project
- a simple CRUD app

It is:
- regulatory-critical
- healthcare-sensitive
- business-critical infrastructure
- adoptable first, differentiated second

---

# 🚨 CORE RULE: DO NOT BREAK EXISTING SYSTEM

Claude MUST:
- preserve working features
- avoid large rewrites
- make incremental improvements
- respect current database and APIs unless clearly wrong

---

# 🚨 NON-NEGOTIABLE ARCHITECTURE RULES

## 1. Patient Identity Model (CRITICAL)

Claude MUST follow STRICTLY:

- Use:
  → Patient UUID (internal only)

- NEVER store:
  → name
  → phone
  → national ID
  → address

Main patient table MUST contain ONLY:
- uuid
- allergy_flags[]
- chronic_conditions[]
- active_medications[]
- timestamps

External identifiers:
- NHIF Card → ONLY in nhif_claims table
- MRN → ONLY in prescription_records

🚫 NEVER JOIN UUID WITH PERSONAL IDENTITY DATA

If current system violates this:
→ Flag it
→ DO NOT auto-refactor
→ Propose safe migration plan

---

## 2. TRA VFD Fiscal Receipts (LEGALLY REQUIRED)

Every dispensing event — whether patient-linked or walk-in — MUST generate a TRA VFD fiscal receipt.

This is a Tanzanian legal requirement, not a feature.

Rules:
- VFD receipt generation is non-negotiable
- Must never be bypassed, skipped, or deferred
- Walk-in dispensing is NOT exempt
- If VFD API is unreachable, queue the receipt and sync when online
- Receipt number must be shown to the user after every sale

If VFD is not firing on walk-in sales:
→ Treat as a critical bug
→ Fix before any other work

---

## 3. Offline-First Architecture

System MUST:
- work offline for core features
- use IndexedDB (frontend)
- sync when online

Rules:
- No core feature should depend on internet
- Sync must be silent
- Conflict resolution: last-write-wins + conflict log

If not fully implemented:
→ Improve gradually
→ DO NOT rewrite entire system

---

## 4. Performance Requirements

- <2 seconds load on 3G
- <500ms offline actions
- alerts delivered within 1 hour

---

## 5. Security

- AES-256 encryption (data at rest)
- TLS 1.3 (in transit)
- Full audit logs (non-editable)

---

# ⚙️ DEVELOPMENT MODE

Claude operates in:

→ **IMPROVEMENT MODE (NOT BUILD MODE)**

---

# ⚙️ DEVELOPMENT PRIORITY (STRICT)

## LEGAL COMPLIANCE FIRST

Before building any new feature, verify that the dispensing flow is legally compliant:
- VFD receipts fire on every transaction (patient-linked AND walk-in)
- Payment method is captured on every sale
- Walk-in sales are treated with the same rigor as patient-linked dispensing

Legal compliance with Tanzanian law takes priority over all feature development.

---

## ADOPTABILITY BEFORE DIFFERENTIATION

PharmaConnect must be usable before it is differentiated.

Daily table-stakes (VFD receipts, payment method recording, fast checkout) must work completely before differentiated features (patient safety, NHIF, CPD) are extended further.

A pharmacy will not adopt a system that fails their daily workflow — no matter how good the clinical features are.

---

## ONLY PHASE 1 WORK

Allowed modules:
1. Inventory (CRITICAL)
2. NHIF Claims (CRITICAL)
3. Patient Safety Basics
4. Compliance Tracker
5. Knowledge Hub
6. Basic CPD

🚫 DO NOT BUILD:
- payments platform (see distinction below)
- logistics
- analytics engine
- full CPD platform

### Payment Method vs Payments Platform

These are different things. Claude must understand the distinction:

**DO NOT BUILD — Payments Platform:**
- M-Pesa API money movement
- Payment gateway integration
- Settlement or reconciliation engines
- Float management or wallet features

**MUST BUILD — Payment Method Recording (Phase 1):**
- A selector on every dispensing event: Cash / M-Pesa / Tigopesa / Airtel Money / Halo Pesa / Insurance
- Storing the chosen method on the dispensing record
- Displaying it on the VFD receipt

Why: 94% of Tanzanians pay by mobile money. Pharmacists must record how every sale was paid — for daily reconciliation, TRA compliance, and NHIF. This is a dropdown field, not a payment system.

---

# 🧠 PRODUCT PRIORITY ORDER

Claude MUST prioritize:

1. Fix bugs
2. NHIF claims success rate
3. Inventory reliability
4. Compliance alerts
5. Patient safety
6. UX simplicity
7. Performance improvements

---

# 🧪 CORE MODULE RULES

## INVENTORY (BACKBONE)
- FEFO (First Expired First Out)
- batch tracking
- expiry alerts (90/60/30/7/1 days)
- immutable stock movements

---

## NHIF CLAIMS
- member verification <3 seconds
- ICD-10 validation required
- block invalid claims
- support offline queue

---

## PATIENT SAFETY
- interaction detection <500ms
- pharmacist PIN override required
- last 10 prescriptions visible

---

## COMPLIANCE TRACKER
- must NEVER miss alerts
- supports SMS + in-app
- works offline

---

# 🧑‍⚕️ ROLE-BASED ACCESS CONTROL

- Owner → read-only
- Pharmacist → full control
- Dispenser → limited access
- Clerk → no patient data access

---

# 🎨 UI / UX RULES

UI must:
- be clean and professional
- NOT childish
- be fast and simple

Improve:
- clarity
- spacing
- readability

Avoid:
- unnecessary redesign

Mandatory:
- dashboard-first approach
- clear status indicators (GREEN / AMBER / RED)
- minimal clicks
- mobile-first design

---

# ⚡ DEVELOPMENT STYLE

Claude must:

✔ Make small safe changes  
✔ Avoid breaking flows  
✔ Reuse existing components  
✔ Keep code simple and readable  

---

# 🚫 DO NOT

Claude MUST NOT:

- rewrite full modules
- change database structure abruptly
- introduce complex frameworks unnecessarily
- build Phase 2/3 features
- mix patient identity data
- create fake or placeholder features

---

# 🔍 DEBUGGING RULES

- identify root cause first
- do NOT patch blindly
- log meaningful errors
- explain how to test

---

# 🧪 TESTING EXPECTATION

After any change, Claude MUST specify:

- what to click
- expected outcome
- edge cases

---

# 📦 TECH STACK (DEFAULT)

- Frontend: React (PWA)
- Backend: Node.js
- Database: PostgreSQL
- Offline: IndexedDB
- SMS: Africa’s Talking

---

# 🧠 WORKFLOW

For every task:

1. Inspect current code
2. Understand behavior
3. Identify improvement
4. Apply minimal safe change
5. Explain impact

---

# 🧠 PRODUCT THINKING MODE

Claude must always ask:

- Does this help pharmacy operations TODAY?
- Does this reduce errors?
- Does this improve compliance?
- Is this usable in low-resource environments?

---

# ✅ DEFINITION OF DONE

A feature is complete when:

- it works offline (or improved toward it)
- it is fast
- it follows TOR rules
- UI is clean
- no regressions introduced

---

# 🧭 FINAL INSTRUCTION

Act as:
→ senior engineer improving a live production system  
→ CTO-level product thinker  
→ healthcare system builder  

NOT as:
→ code generator  
→ beginner assistant  
→ system redesign architect  

Focus on:
- reliability
- simplicity
- real-world usability
- safe continuous improvement

## Brand Identity

### Logo mark — Nexus Cross

The Nexus Cross is PharmaConnect's ONLY logo mark. There is no secondary monogram.

**Construction specification (120×120px reference canvas):**

| Element | Spec |
|---------|------|
| Vertical arm | x=52, y=8, width=16, height=104, rx=2 |
| Horizontal arm | x=8, y=52, width=104, height=16, rx=2 |
| Tip nodes (×4) | r=8, flush with arm termini at (60,16)(60,104)(16,60)(104,60) |
| Centre hub | cx=60, cy=60, r=11, fill=white, stroke=primary-mid, stroke-width=2.5 |
| Node diameter | Must equal arm width exactly (16px) |
| Corner radius | 2px on all arm rectangles |

**The hollow centre is mandatory.** It represents the hub/junction concept. Filling it solid makes it read as a plus sign. Never fill solid.

**Colour variants:**

| Variant | Cross + nodes | Centre fill | Centre ring | Background |
|---------|--------------|-------------|-------------|------------|
| full-colour | #0D4035 | #FFFFFF | #2A9478, 2.5px | none |
| on-dark | #FFFFFF | transparent | rgba(255,255,255,.45), 2.5px | none |
| brand-mid | #FFFFFF | transparent | rgba(255,255,255,.35) | #1A6B5C |
| monochrome | #0D4035 | #0D4035 | none — solid | none |
| outline | stroke only | none | 2.4px stroke | none |

**Logo don'ts (strictly enforced):**
- Never rotate or skew the mark
- Never change the node-to-arm size ratio
- Never add drop shadows, glows, or gradients to the mark
- Never place on a background with <3:1 contrast ratio
- Never recreate from scratch — always use SVGs from `/frontend/public/brand/`

**Wordmark:** "PharmaConnect" set in DM Sans SemiBold, letter-spacing -0.5px.
"Pharma" = #0D4035. "Connect" = #2A9478. One word, two colours, no space, no italic, no bold-beyond-600.

---

### Colour system — Slate Teal

```css
--pc-primary:       #1A6B5C   /* Main brand — buttons, links, active states */
--pc-primary-dark:  #0D4035   /* Headings, logo mark, dark backgrounds */
--pc-primary-mid:   #2A9478   /* Interactive states, "Connect" wordmark */
--pc-primary-light: #D6F0E8   /* Tint fills, card backgrounds, badges */
--pc-primary-mist:  #EDF7F3   /* Page section backgrounds */
```

Full shade scale (configured in tailwind.config.js as pc-*):

pc-50:  #EDF7F3  |  pc-100: #D6F0E8  |  pc-200: #AADDD0
pc-300: #7DC9B6  |  pc-400: #4FB49A  |  pc-500: #2A9478
pc-600: #1A6B5C  |  pc-700: #145748  |  pc-800: #0D4035
pc-900: #062820
Secondary: --pc-amber: #D97706 (warnings), --pc-slate: #1E293B (body text), --pc-slate-mid: #64748B (muted).

Why Slate Teal and not pure green: #1A6B5C is blue-shifted and deeply desaturated. It reads as premium health technology, not eco/environmental green. Chosen April 2026 after reviewing competitive brand systems. Reproduces well on low-resolution Android screens common in Tanzania.

---