# TASK-19 — QA-03: Add /settings Index Redirect

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

LOW

## Problem

`frontend/src/App.tsx` has no route for `/settings` itself — only sub-routes like
`/settings/profile`, `/settings/team`, etc. Navigating to `/settings` directly
falls through to a 404 or an empty page.

---

## Scope

One file only: `frontend/src/App.tsx`.

---

## Changes

Add an index redirect inside the settings route group:

```tsx
import { Navigate } from 'react-router-dom';

// Add before or alongside the /settings/profile route
<Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
```

If the router uses nested routes with a layout component, add it as an index route:

```tsx
<Route index element={<Navigate to="profile" replace />} />
```

---

## Acceptance Criteria

- Navigating to `/settings` immediately redirects to `/settings/profile` without
  a 404 flash or blank screen.
- All existing `/settings/*` sub-routes continue to work.
- No other routes or components are modified.
