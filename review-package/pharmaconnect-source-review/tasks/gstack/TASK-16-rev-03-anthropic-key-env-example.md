# TASK-16 — REV-03: Document ANTHROPIC_API_KEY in .env.example + Startup Warning

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`ANTHROPIC_API_KEY` is required for AI-assisted catalogue import but is absent from
`backend/.env.example`. New developers hit a silent runtime error with no indication
of which key is missing.

---

## Scope

Two files:
- `backend/.env.example`
- `backend/src/index.ts`

---

## Changes

### 1 — Add to `backend/.env.example`

```
# Required for AI-assisted catalogue import (optional — rest of app works without it)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 2 — Add a non-fatal startup warning in `index.ts`

```typescript
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[startup] ANTHROPIC_API_KEY not set — AI catalogue import will be unavailable.');
}
```

This is a warning, not a `process.exit()` — the rest of the app works without it.

---

## Acceptance Criteria

- `backend/.env.example` lists `ANTHROPIC_API_KEY` with a comment explaining its purpose.
- Server starts without the key but logs a single warning line.
- Server starts and runs normally with a valid key.
- Catalogue import logic itself is not modified.
