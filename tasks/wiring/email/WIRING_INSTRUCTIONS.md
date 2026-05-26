# Email Module — Wiring Instructions

APOTEKH transactional email via Resend.  
Five files, zero external config beyond the steps below.

---

## 1. Install the Resend SDK

```bash
cd backend
npm install resend
```

---

## 2. Environment variables

Add these to your `.env` (and `.env.example` for the team):

```env
# Email — Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx   # from resend.com → API Keys
EMAIL_FROM=noreply@apotekh.tz            # must be a verified sender domain in Resend
APP_URL=https://apotekh.tz               # no trailing slash — used in email links
```

**Development note:** If `RESEND_API_KEY` is missing in dev, the service logs a
warning and skips the send silently. In production it throws hard — misconfigured
email will crash the send, not silently drop it.

---

## 3. Prisma — add flags to the Pharmacy model

These three booleans ensure each lifecycle email fires exactly once, not on every
request that passes through trial enforcement middleware.

```prisma
model Pharmacy {
  // ... existing fields ...

  // Email lifecycle flags
  emailSentTrialDay7    Boolean  @default(false)
  emailSentTrialExpiry  Boolean  @default(false)
  emailSentGrace        Boolean  @default(false)
}
```

After adding:
```bash
npx prisma migrate dev --name add_email_sent_flags
```

---

## 4. File locations

Copy the `email/backend/` files into your backend source tree:

```
backend/src/modules/email/
  email.service.ts
  email.templates.ts
  email.triggers.auth.ts
  email.triggers.subscription.ts
  email.triggers.operational.ts
```

> **Import path note:** The trigger files use relative imports like
> `'./email.service'` and `'./email.templates'`. If you place them in a
> different path, update those imports accordingly.

---

## 5. Integration points

### 5a. Auth — password reset

File: `backend/src/modules/auth/auth.router.ts` (or `auth.service.ts`)

```typescript
import { sendPasswordResetEmail } from '../email/email.triggers.auth';

// Inside POST /auth/forgot-password, after saving resetToken to DB:
await sendPasswordResetEmail(user.email, user.name, resetToken);
```

### 5b. Auth — welcome email

File: `backend/src/modules/auth/auth.router.ts` (or wherever pharmacy onboarding completes)

```typescript
import { sendWelcomeEmail } from '../email/email.triggers.auth';

// Inside POST /auth/register, after pharmacy + user are created:
await sendWelcomeEmail(user.email, user.name, pharmacy.name);
```

---

### 5c. Trial middleware — day 7 warning

File: `backend/src/middleware/trialEnforcement.ts`

```typescript
import {
  sendTrialDay7Warning,
  sendTrialExpiredNotice,
  sendGraceAccessNotice,
} from '../modules/email/email.triggers.subscription';

// Inside the middleware, after you've loaded `pharmacy` and computed `daysRemaining`:

const owner = await prisma.user.findFirst({
  where: { pharmacyId: pharmacy.id, role: 'OWNER' },
});

// Day 7 warning (fire-and-forget)
if (daysRemaining === 7 && !pharmacy.emailSentTrialDay7 && owner) {
  sendTrialDay7Warning({
    to: owner.email, name: owner.name,
    pharmacyName: pharmacy.name, daysLeft: 7,
  }).catch(console.error);
  await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data:  { emailSentTrialDay7: true },
  });
}
```

### 5d. Trial middleware — expiry notice

```typescript
// Inside the same middleware, when trial flips to expired:
if (trialJustExpired && !pharmacy.emailSentTrialExpiry && owner) {
  sendTrialExpiredNotice({
    to: owner.email, name: owner.name,
    pharmacyName: pharmacy.name,
  }).catch(console.error);
  await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data:  { emailSentTrialExpiry: true },
  });
}
```

### 5e. Trial middleware — grace notice

```typescript
// When subscription lapses and pharmacy enters read-only/grace mode:
if (subscriptionLapsed && !pharmacy.emailSentGrace && owner) {
  sendGraceAccessNotice({
    to: owner.email, name: owner.name,
    pharmacyName: pharmacy.name,
  }).catch(console.error);
  await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data:  { emailSentGrace: true },
  });
}
```

---

### 5f. Subscription router — payment confirmed

File: `backend/src/modules/subscriptions/subscription.router.ts`

```typescript
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewalFailedEmail,
} from '../email/email.triggers.subscription';

// After Selcom payment webhook confirms payment:
await sendSubscriptionActivatedEmail({
  to:              owner.email,
  name:            owner.name,
  pharmacyName:    pharmacy.name,
  planName:        plan.name,                   // e.g. "Standard Monthly"
  nextBillingDate: formatDate(nextBillingDate), // e.g. "30 June 2025"
});
```

### 5g. Subscription router — renewal failure

```typescript
// After automated renewal charge fails:
await sendSubscriptionRenewalFailedEmail({
  to:           owner.email,
  name:         owner.name,
  pharmacyName: pharmacy.name,
  amount:       `Tsh ${plan.amountTzs.toLocaleString()}`,
});
```

---

### 5h. Inventory module — low stock alert

File: `backend/src/modules/inventory/` (wherever stock levels are adjusted)

```typescript
import { sendLowStockAlert } from '../email/email.triggers.operational';

// After a dispense or stock adjustment, check for items below reorderLevel.
// Use a cooldown (e.g. lastStockAlertSentAt on Pharmacy) to cap at once per day.
const lowItems = updatedItems.filter(i => i.currentStock <= i.reorderLevel);
if (lowItems.length > 0) {
  await sendLowStockAlert({
    to:           [owner.email, pharmacistInCharge.email],
    name:         owner.name,
    pharmacyName: pharmacy.name,
    items: lowItems.map(i => ({
      productName:  i.product.name,
      currentStock: i.currentStock,
      unit:         i.product.unit,         // e.g. "tablets", "ml"
      reorderLevel: i.reorderLevel,
    })),
  });
}
```

---

### 5i. B2B / wholesale — order confirmation

File: `backend/src/modules/wholesale/b2b.router.ts`

```typescript
import {
  sendB2BOrderConfirmation,
  sendB2BOrderStatusUpdate,
} from '../email/email.triggers.operational';

// POST /b2b/orders — after order is created:
await sendB2BOrderConfirmation({
  to:             user.email,
  name:           user.name,
  pharmacyName:   pharmacy.name,
  orderReference: order.reference,   // e.g. "ORD-2025-00312"
  supplierName:   supplier.name,
  itemCount:      order.items.length,
  totalAmountTzs: order.totalAmountTzs,
  orderId:        order.id,
});
```

### 5j. B2B / wholesale — order status update

```typescript
// PATCH /b2b/orders/:id/status — after status change:
await sendB2BOrderStatusUpdate({
  to:             order.pharmacy.owner.email,
  name:           order.pharmacy.owner.name,
  pharmacyName:   order.pharmacy.name,
  orderReference: order.reference,
  newStatus:      newStatus,             // 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'PARTIAL'
  statusNote:     req.body.note,         // optional free-text from supplier
  orderId:        order.id,
});
```

---

### 5k. Override audit — flagged alert

File: `backend/src/modules/overrides/overrides.router.ts`

```typescript
import { sendOverrideFlaggedAlert } from '../email/email.triggers.operational';

// PATCH /overrides/:id/flag — after flag is saved to DB:
const recipients = await prisma.user.findMany({
  where: {
    pharmacyId: override.pharmacyId,
    role: { in: ['OWNER', 'PHARMACIST_IN_CHARGE'] },
  },
});
await sendOverrideFlaggedAlert({
  to:           recipients.map(r => r.email),
  name:         recipients[0].name,     // salutation for the first recipient
  pharmacyName: override.pharmacy.name,
  drugName:     override.drug.name,
  overrideType: override.overrideType,  // e.g. 'AWaRe', 'INTERACTION', 'ALLERGY'
  flagReason:   override.flagReason,
  reviewedBy:   reviewer.name,          // the user who flagged it
});
```

---

## 6. Minor code note

`email.triggers.operational.ts` reads `process.env.APP_URL` directly to build
per-order deep-link URLs. The other trigger files import the `APP_URL` constant
from `email.service`. Both approaches work identically — no action required,
but if you refactor later, bring operational in line with the others.

---

## 7. Resend sender domain

Before emails deliver, you must verify your sender domain in Resend:
1. Log in at [resend.com](https://resend.com) → **Domains** → Add Domain
2. Add the DNS TXT/CNAME records to your domain registrar
3. Set `EMAIL_FROM=noreply@apotekh.tz` (or whichever subdomain/address you verify)

Until the domain is verified, Resend will only deliver to addresses in your
Resend account's test inbox.

---

## Summary

| Step | Action |
|------|--------|
| 1 | `npm install resend` in backend |
| 2 | Add `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` to `.env` |
| 3 | Add 3 Boolean fields to Prisma `Pharmacy` model + migrate |
| 4 | Copy 5 files into `backend/src/modules/email/` |
| 5a–b | Wire auth trigger calls into auth router |
| 5c–e | Wire 3 trial/grace calls into trial enforcement middleware |
| 5f–g | Wire subscription confirmation + renewal-failed into subscription router |
| 5h | Wire low stock alert into inventory module (with cooldown) |
| 5i–j | Wire B2B order confirmation + status into wholesale router |
| 5k | Wire override flagged alert into overrides router |
| 6 | Verify sender domain in Resend dashboard |
