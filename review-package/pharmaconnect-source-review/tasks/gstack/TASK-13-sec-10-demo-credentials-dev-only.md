# TASK-13 — SEC-10: Gate Demo Credentials Behind import.meta.env.DEV

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`frontend/src/modules/auth/LoginPage.tsx` contains `const DEMO_PASSWORD = 'Demo123!'`
and a demo accounts list unconditionally. These ship in the production JS bundle,
exposing known credentials to anyone who inspects the bundle.

Note: CLAUDE.md states demo accounts are intentional for development/demo and must
be removed before final production launch. This task gates them in the code so
`npm run build` excludes them automatically without requiring a manual file edit.

---

## Scope

One file only: `frontend/src/modules/auth/LoginPage.tsx`.

---

## Changes

```typescript
// Add at the top of the component file
const isDev = import.meta.env.DEV;

// Gate the password and account list
const DEMO_PASSWORD = isDev ? 'Demo123!' : '';
const DEMO_ACCOUNTS = isDev ? [/* existing array */] : [];
```

In the JSX, wrap the demo accounts panel:

```tsx
{isDev && (
  <div className="...demo accounts UI...">
    ...
  </div>
)}
```

---

## Acceptance Criteria

- `npm run build` produces a production bundle with no occurrences of `Demo123!`.
- Running `npm run dev` still shows demo account buttons and they work.
- The login form itself (email/password fields, submit button) is not modified.
