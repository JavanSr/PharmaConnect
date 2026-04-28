# TASK-21 — QA-05: Remove "Dosage Suggestions" from PatientSafetyPanel Placeholder

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`frontend/src/modules/dispensing/PatientSafetyPanel.tsx` line 101 reads:

```
Add medicines to start interaction checks, contraindication review, precaution alerts, dosage suggestions,
```

"Dosage suggestions" was removed from the actual panel features but remains in the
placeholder text, misleading users about what the panel provides.

---

## Scope

One file only: `frontend/src/modules/dispensing/PatientSafetyPanel.tsx`.

---

## Changes

```typescript
// Before (line 101)
Add medicines to start interaction checks, contraindication review, precaution alerts, dosage suggestions,

// After
Add medicines to start interaction checks, contraindication review, and precaution alerts.
```

---

## Acceptance Criteria

- The placeholder text in the empty-state of PatientSafetyPanel does not mention
  "dosage suggestions".
- No other content, logic, or styling in the file is modified.
