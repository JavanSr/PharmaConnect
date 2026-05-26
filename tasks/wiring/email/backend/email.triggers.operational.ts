// backend/src/modules/email/email.triggers.operational.ts
//
// Operational alert emails: low stock, B2B orders, override flags.
//
// ── Integration points ───────────────────────────────────────────────────────
//
// LOW STOCK ALERT
//   In backend/src/modules/inventory/ (wherever stock levels are updated
//   after a dispense or stock adjustment):
//   After updating stock, check if any item crossed below reorderLevel.
//   If yes, call sendLowStockAlert() once per day max (use a cooldown flag
//   or a LastStockAlertSentAt timestamp on the pharmacy to avoid spam).
//
// B2B ORDER CONFIRMATION
//   In backend/src/modules/wholesale/b2b.router.ts:
//   POST /b2b/orders → after order is created, call sendB2BOrderConfirmation()
//   PATCH /b2b/orders/:id/status → after status change, call sendB2BOrderStatusUpdate()
//
// OVERRIDE FLAGGED
//   In backend/src/modules/overrides/overrides.router.ts:
//   PATCH /overrides/:id/flag → after flag is saved, call sendOverrideFlaggedAlert()
//   to the pharmacy OWNER and PHARMACIST_IN_CHARGE.

import { sendEmail } from './email.service';
import {
  lowStockAlertEmail,
  b2bOrderConfirmationEmail,
  b2bOrderStatusEmail,
  overrideFlaggedEmail,
} from './email.templates';

// ── Low stock alert ───────────────────────────────────────────────────────────

export async function sendLowStockAlert(opts: {
  to:           string | string[];
  name:         string;
  pharmacyName: string;
  items: Array<{
    productName:  string;
    currentStock: number;
    unit:         string;
    reorderLevel: number;
  }>;
}): Promise<void> {
  if (opts.items.length === 0) return;
  const { subject, html } = lowStockAlertEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
    items:         opts.items,
  });
  await sendEmail({ to: opts.to, subject, html });
}

// ── B2B order emails ──────────────────────────────────────────────────────────

export async function sendB2BOrderConfirmation(opts: {
  to:             string;
  name:           string;
  pharmacyName:   string;
  orderReference: string;
  supplierName:   string;
  itemCount:      number;
  totalAmountTzs: number;
  orderId:        string;
}): Promise<void> {
  const { subject, html } = b2bOrderConfirmationEmail({
    recipientName:  opts.name,
    pharmacyName:   opts.pharmacyName,
    orderReference: opts.orderReference,
    supplierName:   opts.supplierName,
    itemCount:      opts.itemCount,
    totalAmountTzs: opts.totalAmountTzs,
    orderUrl:       `${process.env.APP_URL ?? 'https://apotekh.tz'}/wholesale/orders/${opts.orderId}`,
  });
  await sendEmail({ to: opts.to, subject, html });
}

export async function sendB2BOrderStatusUpdate(opts: {
  to:             string;
  name:           string;
  pharmacyName:   string;
  orderReference: string;
  newStatus:      string;
  statusNote?:    string;
  orderId:        string;
}): Promise<void> {
  const { subject, html } = b2bOrderStatusEmail({
    recipientName:  opts.name,
    pharmacyName:   opts.pharmacyName,
    orderReference: opts.orderReference,
    newStatus:      opts.newStatus,
    statusNote:     opts.statusNote,
    orderUrl:       `${process.env.APP_URL ?? 'https://apotekh.tz'}/wholesale/orders/${opts.orderId}`,
  });
  await sendEmail({ to: opts.to, subject, html });
}

// ── Override flagged alert ────────────────────────────────────────────────────

export async function sendOverrideFlaggedAlert(opts: {
  to:           string | string[];  // OWNER + PHARMACIST_IN_CHARGE emails
  name:         string;
  pharmacyName: string;
  drugName:     string;
  overrideType: string;
  flagReason:   string;
  reviewedBy:   string;
}): Promise<void> {
  const { subject, html } = overrideFlaggedEmail({
    recipientName: opts.name,
    pharmacyName:  opts.pharmacyName,
    drugName:      opts.drugName,
    overrideType:  opts.overrideType,
    flagReason:    opts.flagReason,
    reviewedBy:    opts.reviewedBy,
  });
  await sendEmail({ to: opts.to, subject, html });
}
