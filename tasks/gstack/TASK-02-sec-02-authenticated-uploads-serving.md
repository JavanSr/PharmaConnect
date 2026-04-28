# TASK-02 — SEC-02: Remove Unauthenticated /uploads Static Serving

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

CRITICAL

## Problem

`backend/src/index.ts` serves the entire `uploads/` directory publicly via
`express.static`, exposing prescription photos and compliance documents to
anyone who can guess a filename.

Vulnerable line (approx line 55):
```typescript
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
```

---

## Scope

One file only: `backend/src/index.ts`.

---

## Changes

### 1 — Delete the static serve line

Remove the `app.use('/uploads', express.static(...))` line entirely.

### 2 — Add an authenticated file route in its place

```typescript
app.get('/uploads/:filename', authenticate, (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, '../../uploads', filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(filePath);
});
```

Add `import fs from 'fs';` if not already present.

---

## Acceptance Criteria

- `GET /uploads/test.jpg` without JWT → 401.
- `GET /uploads/test.jpg` with valid JWT → file or 404.
- `GET /uploads/../src/index.ts` with valid JWT → 404 (basename strips traversal).
- No other routes or middleware are modified.
