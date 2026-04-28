# TASK-26 — CSO-01: Apply PIC PIN Rate Limit to /patient-safety/override

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

`POST /api/v1/patient-safety/override` accepts a 4-digit PIC PIN (`pic_pin`) via the
`requirePicPin` middleware but has **no rate limiter**. An authenticated DISPENSER can
cycle all 10,000 PIN combinations until the PIC PIN is found, then override a
CONTRAINDICATED drug interaction alert without real PIC authorisation.

`dispensing.router.ts` already defines `picPinLimiter` (5 attempts / 15 min, keyed by
`pharmacyId`) and applies it to `/dispensing/checkout`. The patient safety override
endpoint is the identical attack surface but is unprotected.

---

## Scope

Two files only:

- `backend/src/middleware/pic-pin.ts` — extract the shared limiter here
- `backend/src/modules/patient-safety/patient-safety.router.ts` — apply it
- `backend/src/modules/dispensing/dispensing.router.ts` — remove the now-duplicate
  local definition and import the shared one

Do not change any other files.

---

## Changes required

### Step 1 — Move the limiter to shared middleware

In `backend/src/middleware/pic-pin.ts`, add the shared limiter after the existing
imports:

```typescript
import rateLimit from 'express-rate-limit';
import type { AuthRequest } from './auth';

export const picPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const r = req as AuthRequest;
    return `pic-pin:${r.user?.pharmacyId ?? r.user?.userId ?? 'anonymous'}`;
  },
  message: { error: 'Too many PIN attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

The `skip` logic in `dispensing.router.ts` (skip when no `pic_pin` in body) is
dispensing-specific — do NOT move that to shared. The patient safety route always
requires a PIN, so no `skip` is needed there.

### Step 2 — Apply to patient-safety/override

In `backend/src/modules/patient-safety/patient-safety.router.ts`:

1. Import `picPinLimiter` from `../../middleware/pic-pin`.
2. Add it to the `/override` route before `requirePicPin`:

```typescript
patientSafetyRouter.post('/override', picPinLimiter, requirePicPin, async (req, res, next) => {
```

### Step 3 — Update dispensing.router.ts

1. Remove the local `picPinLimiter` definition (lines 47–55 in current file).
2. Import `picPinLimiter` from `../../middleware/pic-pin`.
3. Keep the local `skip` logic by wrapping or composing — the simplest approach:
   define a local `dispensingPicPinLimiter` that extends the shared one with the
   `skip` function, or keep the local definition and just import + re-export the
   shared config. The cleanest approach:

```typescript
import { picPinLimiter as _picPinLimiter } from '../../middleware/pic-pin';
import rateLimit from 'express-rate-limit';

// dispensing checkout only applies the limit when a pic_pin is actually present
const picPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const r = req as AuthRequest;
    return `pic-pin:${r.user?.pharmacyId ?? r.user?.userId ?? 'anonymous'}`;
  },
  message: { error: 'Too many PIN attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !requestHasPicPin(req as AuthRequest),
});
```

This keeps the dispensing-specific `skip` local. The shared `picPinLimiter` in
`pic-pin.ts` has no `skip`.

---

## Acceptance Criteria

- `POST /api/v1/patient-safety/override` returns HTTP 429 after 5 failed PIN
  attempts within 15 minutes from the same pharmacy.
- `POST /api/v1/dispensing/checkout` continues to return 429 after 5 failed PIN
  attempts and still skips the limiter when no `pic_pin` is present in the body.
- No other routes are changed.
- TypeScript compiles without errors (`npm run build` in `backend/`).
