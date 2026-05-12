# TASK-12 — REV-02: Update Retired Claude Model ID in Catalogue Import

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

`backend/src/modules/inventory/catalogue-import.router.ts` references
`claude-opus-4-5`, a retired model ID. Calls to the Anthropic API with this
ID will return a 404 or deprecation error, breaking AI-assisted catalogue import.

Per CLAUDE.md: the current latest capable model is `claude-opus-4-7`.

---

## Scope

One file only: `backend/src/modules/inventory/catalogue-import.router.ts`.

---

## Changes

```typescript
// Before
model: 'claude-opus-4-5',

// After
model: 'claude-opus-4-7',
```

---

## Acceptance Criteria

- AI-assisted catalogue import completes without a model-not-found error from the
  Anthropic API.
- No other logic in the catalogue import handler is modified.
