# TASK-01 — SEC-01: Fix Stored XSS + Unauthenticated Article HTML Endpoint

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

CRITICAL

## Problem

`backend/src/modules/knowledge/knowledge.router.ts` registers `GET /articles/:slug/html`
before `knowledgeRouter.use(authenticate)`, making it reachable without a JWT.
The handler interpolates `article.title` and `article.body` directly into raw HTML
with no escaping — stored XSS via any article with `<script>` in title or body.

---

## Scope

One file only: `backend/src/modules/knowledge/knowledge.router.ts`.

---

## Changes

### 1 — Move the HTML route after `authenticate`

The `router.get('/:slug/html', ...)` block currently sits before
`knowledgeRouter.use(authenticate)`. Move the entire handler to after that line.

### 2 — Add an HTML escape helper

```typescript
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### 3 — Escape interpolations in the HTML template

```typescript
// Before
<title>${article.title}</title>
<h1>${article.title}</h1>

// After
<title>${escHtml(article.title)}</title>
<h1>${escHtml(article.title)}</h1>
```

---

## Acceptance Criteria

- `GET /articles/any-slug/html` without JWT → 401.
- Article with title `<script>alert(1)</script>` renders as `&lt;script&gt;` in response.
- Authenticated access to a normal article still returns rendered HTML.
- No other routes in the file are modified.
