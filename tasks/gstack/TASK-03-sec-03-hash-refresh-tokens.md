# TASK-03 — SEC-03: Hash Refresh Tokens Before Database Storage

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

`issueAuthTokens()` in `backend/src/modules/auth/pharmacy-membership.service.ts`
stores the raw JWT string in `refresh_tokens.token`. A database breach exposes
every active session for hijacking.

---

## Scope

Two files:
- `backend/src/modules/auth/pharmacy-membership.service.ts`
- `backend/src/modules/auth/auth.service.ts`

---

## Changes

### 1 — Add a hash helper to `pharmacy-membership.service.ts`

```typescript
import crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

### 2 — Hash on store

In `issueAuthTokens()`, at the `prisma.refreshToken.create` call:

```typescript
// Before
token: refreshToken,

// After
token: hashToken(refreshToken),
```

### 3 — Hash on lookup in `auth.service.ts`

Add the identical `hashToken` helper to `auth.service.ts`.
In `refreshTokenService()`, at the `findUnique` call:

```typescript
// Before
where: { token: incomingToken }

// After
where: { token: hashToken(incomingToken) }
```

---

## Deploy Note

Run `TRUNCATE refresh_tokens;` on deploy. Existing plaintext rows will never match
hashed lookups. Users will re-login once — this is expected and acceptable.

---

## Acceptance Criteria

- After login, `refresh_tokens.token` is a 64-character hex string with no `.` separators.
- Refresh flow still works: new token is issued, old hash is deleted.
- No changes to JWT signing/verification in `lib/jwt.ts`.
- No changes to the `RefreshToken` Prisma model or schema.
