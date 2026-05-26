# Wiring Instructions

Each subdirectory here is a **built-but-not-yet-wired** feature. The code is ready to integrate; these folders contain the schema additions, migration SQL, backend service/router files, and frontend components that need to be connected to the live codebase.

| Folder | Feature | Status |
|--------|---------|--------|
| `aware-coverage/` | AWaRe drug classification badges on dispensing items | Ready to wire |
| `email/` | Transactional email (auth, operational alerts, subscription) | Ready to wire |
| `override-audit-dashboard/` | PIC override audit trail dashboard | Ready to wire |
| `subscription/` | Subscription payment flow (PawaPay + Selcom) | Ready to wire |

## How to wire a feature

Each folder contains a `WIRING_INSTRUCTIONS.md` — read it first. The typical steps are:

1. Apply the `schema_addition.prisma` changes to `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <feature>` or apply the raw SQL in `migration_*.sql`
3. Run `npm run db:generate` to regenerate the Prisma client
4. Copy the backend files (`backend/`) into `backend/src/modules/<name>/`
5. Register the router in `backend/src/index.ts`
6. Copy the frontend files (`frontend/`) into `frontend/src/modules/<name>/` or `frontend/src/components/`
7. Add the route/import in `frontend/src/App.tsx`
