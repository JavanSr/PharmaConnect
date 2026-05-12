# TASK-14 — SEC-11: Add NODE_ENV Validation at Server Startup

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`backend/src/index.ts` starts successfully even if `NODE_ENV` is missing or set to
an unexpected value. A missing `NODE_ENV` silently enables dev-mode error leakage
(full Prisma error messages sent to clients) in production.

---

## Scope

One file only: `backend/src/index.ts`.

---

## Changes

Near the top of `index.ts`, after environment loading:

```typescript
if (!process.env.NODE_ENV) {
  console.warn('[startup] NODE_ENV not set — defaulting to development. Set NODE_ENV=production in production.');
  process.env.NODE_ENV = 'development';
}

const validEnvs = ['development', 'test', 'production'];
if (!validEnvs.includes(process.env.NODE_ENV)) {
  console.error(
    `[startup] Invalid NODE_ENV: "${process.env.NODE_ENV}". Must be one of: ${validEnvs.join(', ')}`
  );
  process.exit(1);
}
```

---

## Acceptance Criteria

- Starting the server with `NODE_ENV=staging` exits immediately with a clear error message.
- Starting with no `NODE_ENV` logs a warning and defaults to `development` (does not exit).
- No other startup logic is modified.
