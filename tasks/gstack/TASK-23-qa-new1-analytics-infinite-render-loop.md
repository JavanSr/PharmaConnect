# TASK-23 — QA-NEW1: Fix Infinite useEffect Render Loop in AnalyticsPage

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

HIGH

## Problem

`frontend/src/modules/analytics/AnalyticsPage.tsx` line 74 has a `useEffect` that
triggers an infinite re-render loop. Browser console shows:

```
Warning: Maximum update depth exceeded. This can happen when a component calls
setState inside useEffect, but useEffect either doesn't have a dependency array,
or one of the dependencies changes on every render.
  at AnalyticsPage (AnalyticsPage.tsx:74)
```

Side effects:
- Analytics page renders completely blank — no content visible at all.
- The loop causes `/api/v1/notifications` and `/api/v1/settings/subscription`
  to be called 3+ times per page load across the entire app, not just on the
  analytics page.

---

## Scope

One file only: `frontend/src/modules/analytics/AnalyticsPage.tsx`.
Do not touch any other component, store, or API file.

---

## How to diagnose

Open `AnalyticsPage.tsx` and look for `useEffect` blocks around line 74.
The root cause will be one of:

1. **Missing dependency array** — `useEffect(() => { setState(...) })` with no
   second argument runs after every render.

2. **Unstable dependency** — a dependency that is re-created on every render
   (e.g. an object literal `{}`, array `[]`, or inline function) causes the
   effect to re-fire continuously.

3. **setState in effect with no guard** — calling `setState` unconditionally
   inside an effect whose dependency includes the state being set.

---

## Fix approach

**Case 1 — Missing dependency array:**
Add `[]` (empty array) if the effect should run once on mount, or list the
correct stable dependencies.

**Case 2 — Unstable dependency:**
Move the unstable value outside the component, wrap it in `useMemo`/`useCallback`,
or replace the inline object/array with a stable reference.

**Case 3 — Circular setState:**
Add a guard so `setState` is only called when the value actually changes:
```typescript
useEffect(() => {
  const newValue = computeValue();
  setState(prev => prev === newValue ? prev : newValue);
}, [dependency]);
```

---

## Acceptance Criteria

- Analytics page renders content (charts, tables, or a "no data" state) —
  not a blank screen.
- Browser console shows no "Maximum update depth exceeded" warning.
- `/api/v1/notifications` and `/api/v1/settings/subscription` are each called
  once on page load, not 3+ times.
- No other components or hooks are modified.
