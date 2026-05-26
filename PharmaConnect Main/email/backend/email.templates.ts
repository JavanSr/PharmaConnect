// backend/src/modules/email/email.templates.ts
//
// All transactional email templates for APOTEKH.
// Each function returns { subject, html } ready to pass to sendEmail().

import { baseTemplate, emailButton, emailDivider, APP_URL } from './email.service';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export function passwordResetEmail(opts: {
  recipientName: string;
  resetToken: string;
}) {
  const url = `${APP_URL}/reset-password?token=${opts.resetToken}`;

  return {
    subject: 'Reset your APOTEKH password',
    html: baseTemplate(`
      <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">Password reset request</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${opts.recipientName}, we received a request to reset your APOTEKH password.
        Click the button below to set a new one. This link expires in <strong>1 hour</strong>.
      </p>
      ${emailButton('Reset Password', url)}
      ${emailDivider()}
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        If you did not request this, you can safely ignore this email.
        Your password will not change.
      </p>
    `),
  };
}

export function welcomeEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  loginUrl?:     string;
}) {
  const url = opts.loginUrl ?? `${APP_URL}/login`;

  return {
    subject: `Welcome to APOTEKH — ${opts.pharmacyName} is ready`,
    html: baseTemplate(`
      <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">
        Welcome to APOTEKH, ${opts.recipientName}.
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        <strong>${opts.pharmacyName}</strong> is now live on APOTEKH.
        Your 14-day free trial has started — full access to all features, no payment required yet.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Log in to complete your setup: add your stock, configure your team, and make your first dispense.
      </p>
      ${emailButton('Open APOTEKH', url)}
      ${emailDivider()}
      <p style="color:#64748b;font-size:13px;margin:0 0 6px;"><strong>Quick start checklist:</strong></p>
      <ul style="color:#64748b;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Add your pharmacy staff and set their roles</li>
        <li>Import or add your stock catalogue</li>
        <li>Configure your suppliers</li>
        <li>Run your first test dispense</li>
      </ul>
    `),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL & SUBSCRIPTION
// ─────────────────────────────────────────────────────────────────────────────

export function trialDay7WarningEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  daysLeft:      number;
  upgradeUrl?:   string;
}) {
  const url = opts.upgradeUrl ?? `${APP_URL}/settings/subscription`;

  return {
    subject: `${opts.daysLeft} days left on your APOTEKH trial`,
    html: baseTemplate(`
      <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">
        Your trial ends in ${opts.daysLeft} days
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Hi ${opts.recipientName}, your free trial for <strong>${opts.pharmacyName}</strong>
        ends in <strong>${opts.daysLeft} days</strong>.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Subscribe now to keep dispensing, managing stock, and running your pharmacy
        without interruption.
      </p>
      ${emailButton('Choose a Plan', url)}
      ${emailDivider()}
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Questions about pricing? Reply to this email and we'll help you find the right plan.
      </p>
    `),
  };
}

export function trialExpiredEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  upgradeUrl?:   string;
}) {
  const url = opts.upgradeUrl ?? `${APP_URL}/settings/subscription`;

  return {
    subject: `Your APOTEKH trial has ended — ${opts.pharmacyName}`,
    html: baseTemplate(`
      <h2 style="color:#b45309;font-size:20px;margin:0 0 8px;">
        Your free trial has ended
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Hi ${opts.recipientName}, your 14-day trial for
        <strong>${opts.pharmacyName}</strong> has ended.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Your pharmacy currently has <strong>read-only access</strong> to your data —
        all records, stock history, and dispensing logs are safe and accessible.
        To resume full operations, subscribe to any APOTEKH plan.
      </p>
      ${emailButton('Reactivate Now', url)}
      ${emailDivider()}
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Your data is never deleted. Subscribe at any time to pick up exactly where you left off.
      </p>
    `),
  };
}

export function graceAccessNoticeEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  upgradeUrl?:   string;
}) {
  const url = opts.upgradeUrl ?? `${APP_URL}/settings/subscription`;

  return {
    subject: `APOTEKH — ${opts.pharmacyName} is in read-only mode`,
    html: baseTemplate(`
      <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">
        Your pharmacy is in read-only (grace) mode
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Hi ${opts.recipientName}, the subscription for
        <strong>${opts.pharmacyName}</strong> has lapsed.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        You retain <strong>permanent read access</strong> to all your data —
        dispensing history, stock records, compliance logs, and reports are
        all viewable. Dispensing, stock updates, and ordering are paused
        until your subscription is renewed.
      </p>
      ${emailButton('Renew Subscription', url)}
    `),
  };
}

export function subscriptionActivatedEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  planName:      string;
  nextBillingDate: string; // formatted date string e.g. "30 June 2025"
}) {
  return {
    subject: `Subscription confirmed — ${opts.pharmacyName} is live on APOTEKH`,
    html: baseTemplate(`
      <h2 style="color:#15803d;font-size:20px;margin:0 0 8px;">
        Subscription confirmed ✓
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${opts.recipientName}, your <strong>${opts.planName}</strong> subscription
        for <strong>${opts.pharmacyName}</strong> is now active.
        Your next billing date is <strong>${opts.nextBillingDate}</strong>.
      </p>
      ${emailButton('Open APOTEKH', APP_URL)}
      ${emailDivider()}
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        A VAT invoice for this payment is available in
        <a href="${APP_URL}/settings/billing" style="color:#3b82f6;">Settings → Billing</a>.
      </p>
    `),
  };
}

export function subscriptionRenewalFailedEmail(opts: {
  recipientName: string;
  pharmacyName:  string;
  amount:        string; // e.g. "Tsh 85,000"
  retryUrl?:     string;
}) {
  const url = opts.retryUrl ?? `${APP_URL}/settings/subscription`;

  return {
    subject: `Payment failed — action required for ${opts.pharmacyName}`,
    html: baseTemplate(`
      <h2 style="color:#dc2626;font-size:20px;margin:0 0 8px;">
        Subscription renewal failed
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Hi ${opts.recipientName}, we were unable to collect the renewal payment of
        <strong>${opts.amount}</strong> for <strong>${opts.pharmacyName}</strong>.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Please update your payment details or complete the payment manually to
        keep your pharmacy fully operational.
      </p>
      ${emailButton('Update Payment', url)}
      ${emailDivider()}
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Your pharmacy will enter read-only mode if payment is not received within 7 days.
      </p>
    `),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export function lowStockAlertEmail(opts: {
  recipientName:  string;
  pharmacyName:   string;
  items: Array<{
    productName: string;
    currentStock: number;
    unit: string;
    reorderLevel: number;
  }>;
  stockUrl?: string;
}) {
  const url = opts.stockUrl ?? `${APP_URL}/inventory`;
  const rows = opts.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;
                 color:#0f172a;font-size:14px;">${item.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;
                 color:#dc2626;font-size:14px;font-weight:600;text-align:center;">
        ${item.currentStock} ${item.unit}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;
                 color:#64748b;font-size:14px;text-align:center;">
        ${item.reorderLevel} ${item.unit}
      </td>
    </tr>
  `).join('');

  return {
    subject: `Low stock alert — ${opts.items.length} product${opts.items.length > 1 ? 's' : ''} at ${opts.pharmacyName}`,
    html: baseTemplate(`
      <h2 style="color:#b45309;font-size:20px;margin:0 0 8px;">
        Low stock alert
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${opts.recipientName}, the following products at
        <strong>${opts.pharmacyName}</strong> are at or below reorder level:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;border:1px solid #e2e8f0;
                    border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;
                       color:#64748b;font-weight:600;text-transform:uppercase;
                       letter-spacing:0.5px;">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;
                       color:#64748b;font-weight:600;text-transform:uppercase;
                       letter-spacing:0.5px;">Current Stock</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;
                       color:#64748b;font-weight:600;text-transform:uppercase;
                       letter-spacing:0.5px;">Reorder Level</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${emailButton('View Inventory', url)}
    `),
  };
}

export function b2bOrderConfirmationEmail(opts: {
  recipientName:  string;
  pharmacyName:   string;
  orderReference: string;
  supplierName:   string;
  itemCount:      number;
  totalAmountTzs: number;
  orderUrl?:      string;
}) {
  const url = opts.orderUrl ?? `${APP_URL}/wholesale/orders`;

  return {
    subject: `Order confirmed — ${opts.orderReference}`,
    html: baseTemplate(`
      <h2 style="color:#15803d;font-size:20px;margin:0 0 8px;">
        Order placed successfully ✓
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${opts.recipientName}, your order from <strong>${opts.supplierName}</strong>
        has been placed on behalf of <strong>${opts.pharmacyName}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;margin-bottom:24px;">
        ${[
          ['Order reference', opts.orderReference],
          ['Supplier',        opts.supplierName],
          ['Items ordered',   `${opts.itemCount} product${opts.itemCount !== 1 ? 's' : ''}`],
          ['Total amount',    `Tsh ${opts.totalAmountTzs.toLocaleString()}`],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;">${label}</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
          </tr>
        `).join('')}
      </table>
      ${emailButton('Track Order', url)}
    `),
  };
}

export function b2bOrderStatusEmail(opts: {
  recipientName:  string;
  pharmacyName:   string;
  orderReference: string;
  newStatus:      string; // e.g. 'CONFIRMED', 'DISPATCHED', 'DELIVERED'
  statusNote?:    string;
  orderUrl?:      string;
}) {
  const url  = opts.orderUrl ?? `${APP_URL}/wholesale/orders`;
  const statusColour: Record<string, string> = {
    CONFIRMED:  '#15803d',
    DISPATCHED: '#1d4ed8',
    DELIVERED:  '#15803d',
    CANCELLED:  '#dc2626',
    PARTIAL:    '#b45309',
  };
  const colour = statusColour[opts.newStatus] ?? '#0f172a';

  return {
    subject: `Order ${opts.orderReference} — ${opts.newStatus}`,
    html: baseTemplate(`
      <h2 style="color:${colour};font-size:20px;margin:0 0 8px;">
        Order status updated: ${opts.newStatus}
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Hi ${opts.recipientName}, your order <strong>${opts.orderReference}</strong>
        for <strong>${opts.pharmacyName}</strong> has been updated to
        <strong style="color:${colour};">${opts.newStatus}</strong>.
      </p>
      ${opts.statusNote ? `
        <p style="color:#475569;font-size:14px;background:#f8fafc;
                  border-left:3px solid #e2e8f0;padding:12px 16px;
                  border-radius:4px;margin:0 0 20px;">
          ${opts.statusNote}
        </p>
      ` : '<div style="margin-bottom:20px;"></div>'}
      ${emailButton('View Order', url)}
    `),
  };
}

export function overrideFlaggedEmail(opts: {
  recipientName:  string;
  pharmacyName:   string;
  drugName:       string;
  overrideType:   string;
  flagReason:     string;
  reviewedBy:     string;
  dashboardUrl?:  string;
}) {
  const url = opts.dashboardUrl ?? `${APP_URL}/override-audit`;

  return {
    subject: `Override flagged for review — ${opts.drugName} at ${opts.pharmacyName}`,
    html: baseTemplate(`
      <h2 style="color:#b45309;font-size:20px;margin:0 0 8px;">
        Dispenser override flagged
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hi ${opts.recipientName}, an override event at
        <strong>${opts.pharmacyName}</strong> has been flagged for your review.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;margin-bottom:24px;">
        ${[
          ['Drug',          opts.drugName],
          ['Override type', opts.overrideType],
          ['Flag reason',   opts.flagReason],
          ['Flagged by',    opts.reviewedBy],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;width:140px;">${label}</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;">${value}</td>
          </tr>
        `).join('')}
      </table>
      ${emailButton('View Override Audit', url)}
    `),
  };
}
