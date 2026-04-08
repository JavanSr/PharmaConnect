# DECISIONS.md — PharmaConnect Architecture Decisions

## Purpose
This file records critical architectural decisions.

These decisions MUST NOT be changed without explicit review.

---

# 🧠 CORE SYSTEM DECISIONS

## 1. Patient Identity Model (LOCKED)

- System uses Patient UUID as the ONLY persistent identifier

Rules:
- NO names in patient table
- NO phone numbers
- NO national IDs

External identifiers:
- NHIF Card → nhif_claims table ONLY
- MRN → prescription_records ONLY

🚫 NEVER JOIN UUID WITH PERSONAL IDENTITY

Status: LOCKED

---

## 2. Offline-First Architecture (LOCKED)

- Core features MUST work without internet
- Uses IndexedDB for local storage
- Syncs automatically when online

Status: LOCKED

---

## 3. Phase-Based Development (LOCKED)

Current phase: Phase 1

Allowed modules:
- Inventory
- NHIF Claims
- Patient Safety Basics
- Compliance Tracker
- Knowledge Hub
- Basic CPD

🚫 Phase 2+ features are NOT allowed unless explicitly approved

Status: LOCKED

---

## 4. NHIF as Core Driver (LOCKED)

- NHIF Claims module is a primary adoption driver
- Claims success rate is a key metric

Status: LOCKED

---

## 5. Role-Based Access Control (LOCKED)

- Owner → full control
- Pharmacist → limited
- Dispenser → limited
- Clerk → no patient data

Status: LOCKED

---

# ⚙️ TECHNOLOGY DECISIONS

## Stack

- Frontend → React (PWA)
- Backend → Node.js
- Database → PostgreSQL
- Offline → IndexedDB

Status: DEFAULT (can evolve carefully)

---

# ⚠️ HOW TO HANDLE CHANGES

If a change conflicts with this file:

1. DO NOT implement immediately
2. Document proposed change
3. Evaluate risks
4. Approve explicitly before change

---

# 🧭 FINAL RULE

This file overrides:
- assumptions
- convenience
- AI suggestions

It protects the system from accidental redesign.