# Override Audit Dashboard — Wiring Instructions

## 1. Prisma schema

Open `backend/prisma/schema.prisma` and merge the block from `schema_addition.prisma`.

Then run:
```bash
npx prisma migrate dev --name add_override_log_review_fields
```

---

## 2. Backend module

Copy the two backend files into the repo:
```
backend/src/modules/overrides/overrides.service.ts   ← from backend/overrides.service.ts
backend/src/modules/overrides/overrides.router.ts    ← from backend/overrides.router.ts
```

In `backend/src/index.ts`, add:
```ts
import overridesRouter from './modules/overrides/overrides.router';
// ... after your other route mounts:
app.use('/overrides', overridesRouter);
```

---

## 3. Frontend page

Copy the UI file into the repo:
```
frontend/src/pages/OverrideAuditDashboard.tsx   ← from frontend/OverrideAuditDashboard.tsx
```

In your frontend router (e.g. `frontend/src/App.tsx` or `routes.tsx`), add:
```tsx
import OverrideAuditDashboard from './pages/OverrideAuditDashboard';

// Inside <Routes>:
<Route path="/override-audit" element={<ProtectedRoute roles={['OWNER','PHARMACIST_IN_CHARGE']}><OverrideAuditDashboard /></ProtectedRoute>} />
```

---

## 4. Sidebar nav

Add a nav item (visible to OWNER and PHARMACIST_IN_CHARGE only):
```tsx
{ label: 'Override Audit', href: '/override-audit', icon: ShieldExclamationIcon }
```

---

## 5. Build check

```bash
cd backend  && npm run build   # must be zero TS errors
cd frontend && npm run build   # must be zero TS errors
```

---

## API summary

| Method | Path | Description |
|--------|------|-------------|
| GET | /overrides | List events (filterable: flagged, overrideType, dateFrom, dateTo, page) |
| GET | /overrides/:id | Single event detail |
| PATCH | /overrides/:id/flag | Flag an event (body: `{ flagReason }`) |
| PATCH | /overrides/:id/unflag | Remove flag from an event |

All endpoints require `authenticate` middleware + STANDARD/PREMIUM/ENTERPRISE tier + OWNER/PHARMACIST_IN_CHARGE/ADMIN role.
