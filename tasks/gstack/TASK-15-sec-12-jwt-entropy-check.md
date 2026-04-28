# TASK-15 — SEC-12: Add JWT Secret Entropy Check at Startup

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`backend/src/lib/jwt.ts` reads `JWT_SECRET` and `JWT_REFRESH_SECRET` from environment
variables with no length or entropy check. A short or empty secret makes JWTs trivially
forgeable. The server starts silently with a weak secret.

---

## Scope

One file only: `backend/src/lib/jwt.ts` (or add to `backend/src/index.ts` startup
block if jwt.ts does not have a natural init location — prefer jwt.ts).

---

## Changes

After reading the secrets:

```typescript
const ACCESS_SECRET  = process.env.JWT_SECRET ?? '';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? '';

if (ACCESS_SECRET.length < 32) {
  console.error(
    '[startup] JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32'
  );
  process.exit(1);
}

if (REFRESH_SECRET.length < 32) {
  console.error(
    '[startup] JWT_REFRESH_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32'
  );
  process.exit(1);
}
```

---

## Acceptance Criteria

- Starting the server with a `JWT_SECRET` shorter than 32 characters exits immediately
  with an actionable error message including the `openssl` generation command.
- Starting with a valid 32+ character secret proceeds normally.
- The `signAccess`, `signRefresh`, `verifyAccess`, `verifyRefresh` functions are not modified.
