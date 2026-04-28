# TASK-17 — REV-08: Tighten General API Rate Limiter

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`backend/src/index.ts` sets the general rate limiter to 300 requests per 15 minutes.
For a healthcare API handling sensitive pharmacy data, this is too permissive and
allows extensive scraping or brute-force exploration of endpoints.

---

## Scope

One file only: `backend/src/index.ts`.

---

## Changes

Locate the general rate limiter configuration (approx lines 62–67):

```typescript
// Before
max: 300,

// After
max: 60,
```

---

## Do NOT touch

- The auth rate limiter (already set to 20 req/15min — leave it as-is).
- Any other middleware, routes, or configuration.

---

## Acceptance Criteria

- After 60 requests in 15 minutes from a single IP, subsequent requests return 429.
- The auth limiter remains at 20 req/15min.
- No other behaviour changes.
