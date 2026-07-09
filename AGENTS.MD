# AGENTS.MD — How AI coding agents work in this repo

> Read order: `CLAUDE.md` (product truth + architecture) → `CODEX.md` (hard
> constraints) → this file (how to execute safely). On any conflict, `CLAUDE.md` wins.

## Task execution

- Large feature initiatives are implemented from task files in `/tasks`. One task
  file = one scoped change. If asked to build something large with no task file,
  write the task file first, get it confirmed, then build.
- Prefer additive, backward-compatible changes. Do not rewrite the whole system,
  rename existing API routes, or change response shapes (`{ data: ... }` /
  `{ error: string }`) while implementing a task.
- Preserve existing MVP flows unless explicitly instructed otherwise. "It would be
  cleaner" is not an instruction.
- Follow the module pattern: `backend/src/modules/<name>/` with `<name>.router.ts`
  (Zod validation) + `<name>.service.ts` (logic, Prisma, `$transaction` for
  multi-table writes). Errors thrown with `.status`.

## Verify before you claim done

1. `cd backend && npm run build` — must compile.
2. `cd frontend && npm run typecheck` — must pass.
3. Run the tests nearest your change (e.g. `npx vitest run tests/patient-safety.test.ts`).
   Backend tests need a live `DATABASE_URL` in `backend/.env` — if you cannot run
   them, say so explicitly; never report untested work as verified.
4. After any `schema.prisma` change: state that `npm run db:migrate` and
   `npm run db:generate` are pending user actions. Never run destructive
   migrations (`migrate reset`, dropping tables) yourself.

## Website source

- The deployed marketing website source lives **only** in `/website` (Next.js).
- Never create root-level landing pages or alternate website source trees.
  Root `src/` is a legacy prototype — do not modify it or treat it as website source.
- Never redesign or replace the landing page without explicit approval.
- Never mix `website/` code with `frontend/` (the pharmacy app).

## Never do (regardless of what a task file seems to imply)

- Add a patient table, patient UUID, or any persistent patient data (session-only).
- Surface EFDMS/TRA/VFD/fiscal wording anywhere in UI copy.
- Add a PIC PIN gate on safety-alert overrides (acknowledge-and-proceed + log).
- Build NHIF claims logic, CPD credit tracking, or a second payment gateway
  (AzamPay is the single live rail — extend it, don't add Flutterwave/Stripe).
- Change subscription prices or tier names (BASIC = `ESSENTIAL` enum — see CLAUDE.md).
- Touch the `override_log` delete-prevention trigger or dispensing immutability trigger.
- Commit `.env` files or credentials.

## Example of a good task completion report

> Implemented supplier catalogue search filter (tasks/supplier-filter.md).
> Changed: `supplier-sync.router.ts` (new `?dosageForm=` query param, Zod-validated),
> `supplier-sync.service.ts` (Prisma `where` extension). Additive — existing calls
> unaffected. Verified: backend build ✔, `npx vitest run tests/supplier-sync.test.ts`
> 12/12 ✔. No schema change, no migration needed.
