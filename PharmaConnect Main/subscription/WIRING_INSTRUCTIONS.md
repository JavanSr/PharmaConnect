# Subscription Module — Wiring Instructions

Full PawaPay mobile money integration for APOTEKH. Seven files, one migration.

---

## 1. Install dependencies

```bash
cd backend
npm install zod          # already present — verify
```

No new npm packages required. PawaPay integration uses the native `fetch` API (Node 18+) — just a Bearer token, nothing to install.

---

## 2. Environment variables

Add to `.env` and `.env.example`:

```env
# PawaPay
PAWAPAY_API_TOKEN=your_token_from_pawapay_dashboard
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io   # sandbox — change to https://api.pawapay.io for production

# App URL (used to build webhook callback URL)
APP_URL=https://api.apotekh.co.tz
```

**Sandbox testing:** Create a free account at [dashboard.sandbox.pawapay.io](https://dashboard.sandbox.pawapay.io/#/merchant-signup) — no approval needed, instant access. Generate a token under **Developers → API tokens**. Use `https://api.sandbox.pawapay.io` as the base URL.

---

## 3. Prisma — schema additions

Open `backend/prisma/schema.prisma` and make these changes:

### 3a. Add fields to the existing `Pharmacy` model

```prisma
model Pharmacy {
  // ... existing fields ...

  subscriptionTier    SubscriptionTier    @default(ADDO)
  subscriptionStatus  SubscriptionStatus  @default(TRIALING)
  trialStartedAt      DateTime            @default(now())
  trialEndsAt         DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  gracePeriodEndsAt   DateTime?

  // Email lifecycle flags (add if not already added from email module)
  emailSentTrialDay7    Boolean  @default(false)
  emailSentTrialExpiry  Boolean  @default(false)
  emailSentGrace        Boolean  @default(false)

  subscriptions  Subscription[]
}
```

### 3b. Copy the enums and models from `subscription/schema_addition.prisma`

Paste the full contents of that file (enums + two models) into your `schema.prisma`.

### 3c. Run the migration

```bash
cd backend
npx prisma migrate dev --name add_subscription_module
npx prisma generate
```

---

## 4. Set trial end date for new pharmacies

When a new pharmacy registers, set `trialEndsAt` to 14 days from now. In `auth.router.ts` (or wherever pharmacy onboarding completes):

```typescript
// Inside POST /auth/register, when creating the Pharmacy record:
trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
```

---

## 5. File locations

Copy the module files into your backend and frontend source trees:

```
backend/src/modules/subscriptions/
  pawapay.service.ts        ← PawaPay API integration
  subscription.service.ts   ← business logic
  subscription.router.ts    ← Express routes

frontend/src/pages/
  SubscriptionPage.tsx
```

---

## 6. Mount the router

In `backend/src/index.ts`, import and mount the subscription router **after** your main `express.json()` middleware — the webhook route uses its own `express.raw()` middleware internally:

```typescript
import subscriptionRouter from './modules/subscriptions/subscription.router';

// Mount AFTER express.json()
app.use('/subscriptions', subscriptionRouter);
```

**Important — webhook raw body:** The Selcom webhook route (`POST /subscriptions/webhook/selcom`) needs the raw request body to verify the HMAC signature. The router handles this internally via `express.raw()` on that specific route, so you do **not** need to make any changes to your global middleware.

---

## 7. Register the PawaPay callback URL

Log in to the PawaPay dashboard → **Developers → Callback URLs** and set:

```
Deposit callback:  https://api.apotekh.co.tz/subscriptions/webhook/pawapay
```

PawaPay will POST a JSON payload here when a payment reaches COMPLETED or FAILED.

Optionally whitelist PawaPay's production IPs in Railway:
`18.192.208.15`, `18.195.113.136`, `3.72.212.107`, `54.73.125.42`, `54.155.38.214`, `54.73.130.113`

---

## 8. Add the frontend route

In your React Router config (`frontend/src/App.tsx` or `routes.tsx`):

```typescript
import SubscriptionPage from './pages/SubscriptionPage';

// Inside your <Routes>:
<Route path="/subscription" element={<SubscriptionPage />} />
```

Link to it from your sidebar/settings navigation:
```typescript
<Link to="/subscription">Subscription & Billing</Link>
```

---

## 9. Wire into the trial enforcement middleware

Your existing trial enforcement middleware (e.g. `backend/src/middleware/trialEnforcement.ts`) should call `checkSubscriptionAccess` from the subscription service to determine whether a pharmacy can access the platform:

```typescript
import { checkSubscriptionAccess } from '../modules/subscriptions/subscription.service';

// Inside your middleware, after authenticating the pharmacy:
const access = await checkSubscriptionAccess(req.pharmacy.id);

if (!access.allowed) {
  return res.status(402).json({
    error: 'Subscription required',
    status: access.status,
    upgradeUrl: '/subscription',
  });
}

// Attach to request for downstream use
req.subscriptionReadOnly = access.readOnly;
```

For read-only (GRACE) state, you may want to block mutating operations:
```typescript
if (access.readOnly && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  return res.status(402).json({
    error: 'Grace period — subscription renewal required to make changes',
    status: 'GRACE',
    upgradeUrl: '/subscription',
  });
}
```

---

## 10. Payment flow (end-to-end)

```
Pharmacy owner clicks "Subscribe" → enters phone number + billing period
  → POST /subscriptions/initiate
  → backend auto-detects mobile network from phone number (predict-correspondent)
  → backend creates Subscription + SubscriptionPayment records
  → backend calls POST /deposits on PawaPay API
  → PawaPay sends USSD push to customer's phone
  → Customer enters PIN on their phone to authorise
  → PawaPay POSTs callback to /subscriptions/webhook/pawapay
  → backend marks payment PAID, subscription ACTIVE, pharmacy tier upgraded
  → email sent: "Your subscription is active"
```

---

## 11. Testing in sandbox

1. Create sandbox account at [dashboard.sandbox.pawapay.io](https://dashboard.sandbox.pawapay.io/#/merchant-signup)
2. Generate an API token under **Developers → API tokens**
3. Set `PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io` and `PAWAPAY_API_TOKEN=your_sandbox_token`
4. Set callback URL to your local tunnel (e.g. ngrok) or a deployed URL
5. In sandbox, payments auto-complete after a few seconds — no real phone needed
6. Switch to `https://api.pawapay.io` and a production token to go live

---

## 12. Admin tools

**Manually activate a plan** (for Enterprise customers or offline payments):

```
POST /subscriptions/admin/activate
Requires: SUPER_ADMIN role

Body:
{
  "pharmacyId": "clxxx...",
  "tier": "ENTERPRISE",
  "billingMonths": 12,
  "note": "Paid via bank transfer — receipt #INV-2025-001"
}
```

**View all subscriptions:**
```
GET /subscriptions/admin/list
Requires: SUPER_ADMIN role
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Verify `zod` is installed in backend |
| 2 | Add 2 PawaPay env vars to Railway + `.env` (`PAWAPAY_API_TOKEN`, `PAWAPAY_BASE_URL`) |
| 3 | Add fields to Pharmacy model + enums + two new models → migrate |
| 4 | Set `trialEndsAt` when new pharmacy registers |
| 5 | Copy `pawapay.service.ts`, `subscription.service.ts`, `subscription.router.ts`, `SubscriptionPage.tsx` into repo |
| 6 | Mount router at `/subscriptions` in `index.ts` |
| 7 | Register callback URL in PawaPay dashboard → Developers → Callback URLs |
| 8 | Add `/subscription` route in React Router |
| 9 | Call `checkSubscriptionAccess` from trial enforcement middleware |
| 10 | Create sandbox account at dashboard.sandbox.pawapay.io and test immediately |
