import { Resend } from 'resend';

let resend: Resend | null = null;

const FROM = process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? 'APOTEKH <noreply@apotekh.co.tz>';
const SUPPORT_EMAIL = 'support@apotekh.co.tz';
const APP_URL = process.env.FRONTEND_URL ?? 'https://apotekh.co.tz';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set; skipping email send.');
    return null;
  }

  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function sendEmail(params: Parameters<Resend['emails']['send']>[0]) {
  const client = getResendClient();
  if (!client) {
    return;
  }

  await client.emails.send(params);
}

function baseLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #EDF7F3; font-family: 'DM Sans', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; border: 1px solid #D6F0E8; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2A9478 0%, #0D4035 100%); padding: 28px 32px; }
    .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
    .body { padding: 32px; color: #0D4035; }
    .body p  { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151; }
    .btn { display: inline-block; background: #1A6B5C; color: #fff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 20px; }
    .divider { border: none; border-top: 1px solid #D6F0E8; margin: 24px 0; }
    .footer { padding: 20px 32px; background: #F8FCFA; border-top: 1px solid #D6F0E8; font-size: 12px; color: #94A3B8; }
    .pill { display: inline-block; background: #D6F0E8; color: #1A6B5C; border-radius: 99px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
    .info-box { background: #EDF7F3; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .info-box p { margin: 0; font-size: 13px; color: #1A6B5C; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>APOTEKH</h1>
      <p>TMDA-ready pharmacy operations</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      APOTEKH &nbsp;·&nbsp; Tanzania &nbsp;·&nbsp;
      <a href="https://apotekh.co.tz" style="color:#1A6B5C;">apotekh.co.tz</a>
      <br />If you did not request this email, you can safely ignore it.
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(opts: {
  to: string;
  firstName: string;
  pharmacyName: string;
  token: string;
}) {
  const link = `${APP_URL}/auth/verify-email?token=${opts.token}`;
  const html = baseLayout(`
    <p>Hi <strong>${opts.firstName}</strong>,</p>
    <p>Thanks for registering <strong>${opts.pharmacyName}</strong> on APOTEKH. Please verify your email address to activate your account.</p>
    <a href="${link}" class="btn">Verify my email address</a>
    <p style="font-size:13px;color:#64748B;">This link expires in 24 hours. If the button doesn't work, copy this URL into your browser:</p>
    <p style="font-size:12px;color:#94A3B8;word-break:break-all;">${link}</p>
    <hr class="divider" />
    <div class="info-box">
      <p>Once verified, your 14-day free trial starts automatically. No credit card required.</p>
    </div>
  `);

  await sendEmail({
    from: FROM,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: 'Verify your APOTEKH account',
    html,
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  pharmacyName: string;
  region: string;
  tier: string;
}) {
  const html = baseLayout(`
    <p>Hi <strong>${opts.firstName}</strong>,</p>
    <p>Welcome to APOTEKH! Your account for <strong>${opts.pharmacyName}</strong> is now active. Your 14-day free trial has started.</p>
    <div class="info-box">
      <p><strong>Pharmacy:</strong> ${opts.pharmacyName}</p>
      <p style="margin-top:6px;"><strong>Region:</strong> ${opts.region}</p>
      <p style="margin-top:6px;"><strong>Plan:</strong> <span class="pill">${opts.tier}</span></p>
    </div>
    <p>Here's what you can do right now:</p>
    <ul style="font-size:15px;line-height:1.8;color:#374151;padding-left:20px;">
      <li>Load your product catalogue and stock</li>
      <li>Set up your team (Pharmacist In-Charge, Dispensers)</li>
      <li>Start recording dispensing transactions</li>
      <li>Track compliance items and staff credentials</li>
    </ul>
    <a href="${APP_URL}/dashboard" class="btn">Open APOTEKH</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748B;">Questions? Reply to this email — we read every message personally.</p>
  `);

  await sendEmail({
    from: FROM,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: `Welcome to APOTEKH, ${opts.pharmacyName}!`,
    html,
  });
}

export async function sendFounderNotification(opts: {
  pharmacyName: string;
  ownerName: string;
  ownerEmail: string;
  region: string;
  pharmacyType: string;
  tier: string;
}) {
  const html = baseLayout(`
    <p><strong>New pharmacy registration</strong></p>
    <div class="info-box">
      <p><strong>Pharmacy:</strong> ${opts.pharmacyName}</p>
      <p style="margin-top:6px;"><strong>Owner:</strong> ${opts.ownerName} &lt;${opts.ownerEmail}&gt;</p>
      <p style="margin-top:6px;"><strong>Region:</strong> ${opts.region}</p>
      <p style="margin-top:6px;"><strong>Type:</strong> ${opts.pharmacyType} &nbsp; <span class="pill">${opts.tier}</span></p>
    </div>
    <p style="font-size:13px;color:#64748B;">They need to verify their email before they can log in. Check the Founder Dashboard for status.</p>
    <a href="${APP_URL}/admin" class="btn">Open Admin Dashboard</a>
  `);

  await sendEmail({
    from: FROM,
    to: SUPPORT_EMAIL,
    subject: `New registration: ${opts.pharmacyName} (${opts.region})`,
    html,
  });
}

export async function sendOrderStatusEmail(opts: {
  to: string;
  firstName: string;
  orderNumber: string;
  status: string;
  sellerName: string;
  message: string;
}) {
  const statusLabel: Record<string, string> = {
    CONFIRMED: 'Order confirmed',
    DISPATCHED: 'Order dispatched',
    DELIVERED: 'Order delivered',
    CANCELLED: 'Order cancelled',
  };

  const html = baseLayout(`
    <p>Hi <strong>${opts.firstName}</strong>,</p>
    <p>${opts.message}</p>
    <div class="info-box">
      <p><strong>Order:</strong> ${opts.orderNumber}</p>
      <p style="margin-top:6px;"><strong>Supplier:</strong> ${opts.sellerName}</p>
      <p style="margin-top:6px;"><strong>Status:</strong> <span class="pill">${opts.status}</span></p>
    </div>
    <a href="${APP_URL}/wholesale/orders" class="btn">View order</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748B;">Questions? Contact your supplier or reply to this email.</p>
  `);

  await sendEmail({
    from: FROM,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: `${statusLabel[opts.status] ?? 'Order update'}: ${opts.orderNumber}`,
    html,
  });
}

export async function sendSubscriptionPaymentFailedEmail(opts: {
  to: string;
  firstName: string;
  pharmacyName: string;
  reference: string;
  amount: string;
  reason: string;
}) {
  const html = baseLayout(`
    <p>Hi <strong>${opts.firstName}</strong>,</p>
    <p>Your APOTEKH subscription payment for <strong>${opts.pharmacyName}</strong> could not be completed.</p>
    <div class="info-box">
      <p><strong>Reference:</strong> ${opts.reference}</p>
      <p style="margin-top:6px;"><strong>Amount:</strong> Tsh ${opts.amount}</p>
      <p style="margin-top:6px;"><strong>Reason:</strong> ${opts.reason}</p>
    </div>
    <p>Please check the account balance or payment approval prompt, then try again from the Subscription screen.</p>
    <a href="${APP_URL}/settings/subscription" class="btn">Try payment again</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748B;">If money was deducted, reply to this email with the transaction message so APOTEKH can review it.</p>
  `);

  await sendEmail({
    from: FROM,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: `APOTEKH payment failed: ${opts.reference}`,
    html,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}) {
  const link = `${APP_URL}/auth/reset-password?token=${opts.token}`;
  const html = baseLayout(`
    <p>Hi <strong>${opts.firstName}</strong>,</p>
    <p>Someone requested a password reset for your APOTEKH account. If this was you, click the button below.</p>
    <a href="${link}" class="btn">Reset my password</a>
    <p style="font-size:13px;color:#64748B;">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change.</p>
  `);

  await sendEmail({
    from: FROM,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: 'Reset your APOTEKH password',
    html,
  });
}
