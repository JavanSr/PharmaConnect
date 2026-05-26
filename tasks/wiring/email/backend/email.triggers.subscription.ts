// backend/src/modules/email/email.triggers.subscription.ts
//
// Wire these into the trial enforcement middleware and subscription router.
//
// ── Integration points ───────────────────────────────────────────────────────
//
// TRIAL ENFORCEMENT MIDDLEWARE (backend/src/middleware/trialEnforcement.ts)
// ─────────────────────────────────────────────────────────────────────────
// The middleware already checks trial status on each request.
// Add email sends at these state transitions (fire-and-forget — don't await):
//
//   Day 7 warning  → when daysRemaining === 7 and warning not yet sent
//   Day 14 expiry  → when trial just flipped to expired
//   Grace notice   → when subscription lapsed (post-trial, post-grace period)
//
// Use a flag in the Pharmacy record (e.g. emailSentTrialDay7, emailSentExpiry)
// to ensure each email fires once, not on every request.
// Add these boolean fields to the Pharmacy model if not present:
//   emailSentTrialDay7   Boolean @default(false)
//   emailSentTrialExpiry Boolean @default(false)
//   emailSentGrace       Boolean @default(false)
//
// SUBSCRIPTION ROUTER (backend/src/modules/subscriptions/subscription.router.ts)
// ────────────────────────────────────────────────────────────────────────────
// After Selcom payment webhook confirms payment:
//   → call sendSubscriptionActivatedEmail(...)
// After renewal payment fails:
//   → call sendSubscriptionRenewalFailedEmail(...)

import { sendEmail } from './email.service';
import {
  trialDay7WarningEmail,
  trialExpiredEmail,
  graceAccessNoticeEmail,
  subscriptionActivatedEmail,
  subscriptionRenewalFailedEmail,
} from './email.templates';

// ── Trial emails ─────────────────────────────────────────────────────────────

export async function sendTrialDay7Warning(opts: {
  to:           string;
  name:         string;
  pharmacyName: string;
  daysLeft:     number;
}): Promise<void> {
  const { subject, html } = trialDay7WarningEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
    daysLeft:      opts.daysLeft,
  });
  await sendEmail({ to: opts.to, subject, html });
}

export async function sendTrialExpiredNotice(opts: {
  to:           string;
  name:         string;
  pharmacyName: string;
}): Promise<void> {
  const { subject, html } = trialExpiredEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
  });
  await sendEmail({ to: opts.to, subject, html });
}

export async function sendGraceAccessNotice(opts: {
  to:           string;
  name:         string;
  pharmacyName: string;
}): Promise<void> {
  const { subject, html } = graceAccessNoticeEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
  });
  await sendEmail({ to: opts.to, subject, html });
}

// ── Subscription payment emails ───────────────────────────────────────────────

export async function sendSubscriptionActivatedEmail(opts: {
  to:              string;
  name:            string;
  pharmacyName:    string;
  planName:        string;
  nextBillingDate: string;
}): Promise<void> {
  const { subject, html } = subscriptionActivatedEmail({
    recipientName:   opts.name,
    pharmacyName:    opts.pharmacyName,
    planName:        opts.planName,
    nextBillingDate: opts.nextBillingDate,
  });
  await sendEmail({ to: opts.to, subject, html });
}

export async function sendSubscriptionRenewalFailedEmail(opts: {
  to:           string;
  name:         string;
  pharmacyName: string;
  amount:       string;
}): Promise<void> {
  const { subject, html } = subscriptionRenewalFailedEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
    amount:        opts.amount,
  });
  await sendEmail({ to: opts.to, subject, html });
}

// ── Trial middleware snippet ─────────────────────────────────────────────────
//
// Add this logic inside your existing trial enforcement middleware,
// inside the block where you check pharmacy subscription status:
//
// import { sendTrialDay7Warning, sendTrialExpiredNotice, sendGraceAccessNotice }
//   from '../email/email.triggers.subscription';
//
// const owner = await prisma.user.findFirst({
//   where: { pharmacyId: pharmacy.id, role: 'OWNER' },
// });
//
// // Day 7 warning
// if (daysRemaining === 7 && !pharmacy.emailSentTrialDay7 && owner) {
//   sendTrialDay7Warning({            // fire-and-forget
//     to: owner.email, name: owner.name,
//     pharmacyName: pharmacy.name, daysLeft: 7,
//   }).catch(console.error);
//   await prisma.pharmacy.update({
//     where: { id: pharmacy.id },
//     data:  { emailSentTrialDay7: true },
//   });
// }
//
// // Trial just expired
// if (trialJustExpired && !pharmacy.emailSentTrialExpiry && owner) {
//   sendTrialExpiredNotice({
//     to: owner.email, name: owner.name,
//     pharmacyName: pharmacy.name,
//   }).catch(console.error);
//   await prisma.pharmacy.update({
//     where: { id: pharmacy.id },
//     data:  { emailSentTrialExpiry: true },
//   });
// }
