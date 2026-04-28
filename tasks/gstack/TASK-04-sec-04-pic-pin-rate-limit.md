# TASK-04 — SEC-04: Add Rate Limiting to PIC PIN Verification

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

The PIC PIN override endpoint in `backend/src/modules/dispensing/dispensing.router.ts`
has no per-pharmacy attempt counter. An attacker can try all 4-digit PINs (0000–9999)
in ~10,000 requests with no throttling.

---

## Scope

One file: `backend/src/modules/dispensing/dispensing.router.ts`.

---

## Changes

### 1 — Add a dedicated rate limiter for the PIN route

At the top of the file (near other imports):

```typescript
import rateLimit from 'express-rate-limit';

const picPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `pic-pin:${(req as AuthRequest).user?.pharmacyId ?? req.ip}`,
  message: { error: 'Too many PIN attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 2 — Apply it to the PIN verification route

Find the route that calls `verifyPicPinForPharmacy` and add `picPinLimiter` as middleware:

```typescript
router.post('/override-pin-verify', authenticate, picPinLimiter, requirePermission('dispensing.override_major_alert'), ...)
```

Adjust the path to match the actual route name in the file.

---

## Acceptance Criteria

- 6th PIN attempt within 15 minutes from the same pharmacy → 429 response with the error message.
- Counter resets after 15 minutes.
- `pic-pin.ts` middleware internals are not modified.
- No other dispensing routes are modified.
