# TASK-09 — SEC-08 / REV-06: Replace $queryRawUnsafe with $queryRaw Tagged Template

Read `CLAUDE.md` and `CODEX.md` before writing any code.
Read `AGENTS.md` for safe editing behaviour.
Work incrementally. Do not touch unrelated modules.

---

## Severity

MEDIUM

## Problem

`backend/src/modules/knowledge/knowledge.router.ts` uses `$queryRawUnsafe` with a
string-built WHERE clause. Although values are currently parameterised via a `filters`
array, the pattern is fragile — a future edit could introduce SQL injection.
Prisma's `$queryRaw` tagged template enforces parameterisation at compile time.

---

## Scope

One file only: `backend/src/modules/knowledge/knowledge.router.ts`.

---

## Changes

Locate the `$queryRawUnsafe` call in the articles list handler. Rewrite using
Prisma's `sql` tagged template:

```typescript
import { Prisma } from '@prisma/client';

// Build conditions as Prisma.sql fragments
const conditions: Prisma.Sql[] = [Prisma.sql`pharmacy_id = ${pharmacyId}`];
if (categoryFilter) conditions.push(Prisma.sql`category = ${categoryFilter}`);
if (searchFilter)   conditions.push(Prisma.sql`title ILIKE ${'%' + searchFilter + '%'}`);

const whereClause = conditions.length
  ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
  : Prisma.empty;

const articles = await prisma.$queryRaw<Article[]>(
  Prisma.sql`SELECT * FROM articles ${whereClause} ORDER BY created_at DESC`
);
```

Adjust column names and table name to match the actual schema.

---

## Acceptance Criteria

- No `$queryRawUnsafe` calls remain in `knowledge.router.ts`.
- TypeScript compiles without errors.
- Articles list returns correct results with and without category/search filters.
- No other files are modified.
