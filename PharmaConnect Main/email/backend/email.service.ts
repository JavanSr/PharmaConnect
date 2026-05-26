// backend/src/modules/email/email.service.ts
//
// Provider: Resend (https://resend.com)
// - Simple REST API, no SMTP config, generous free tier (3,000 emails/month)
// - Add to backend/.env:
//     RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
//     EMAIL_FROM=APOTEKH <noreply@apotekh.tz>
//     APP_URL=https://apotekh.tz
//
// Install: cd backend && npm install resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.EMAIL_FROM  ?? 'APOTEKH <noreply@apotekh.tz>';
const APP_URL = process.env.APP_URL     ?? 'https://apotekh.tz';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to:      string | string[];
  subject: string;
  html:    string;
  replyTo?: string;
}

// ── Core send utility ────────────────────────────────────────────────────────

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Fail loudly in production, log softly in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is not set — emails cannot be sent.');
    }
    console.warn('[email] RESEND_API_KEY not set — email suppressed in dev:', opts.subject);
    return;
  }

  const { error } = await resend.emails.send({
    from:     FROM,
    to:       Array.isArray(opts.to) ? opts.to : [opts.to],
    subject:  opts.subject,
    html:     opts.html,
    replyTo:  opts.replyTo,
  });

  if (error) {
    // Log and rethrow — callers decide whether to surface to user
    console.error('[email] Send failed:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

// ── Base HTML template ────────────────────────────────────────────────────────
// All transactional emails share this wrapper for consistent branding.

export function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>APOTEKH</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;
                           letter-spacing:4px;text-transform:uppercase;">
                APOTEKH
              </span>
              <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;
                        letter-spacing:1px;text-transform:uppercase;">
                Powering Pharmacies. Protecting Patients.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;
                       border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                APOTEKH &mdash; Pharmacy Operating System for Tanzania
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">
                This is an automated message. Reply to this email if you need help.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Button helper ─────────────────────────────────────────────────────────────

export function emailButton(label: string, url: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}"
         style="display:inline-block;background:#0f172a;color:#ffffff;
                font-size:14px;font-weight:600;padding:14px 32px;
                border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
        ${label}
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0;">
      Or copy this link: <a href="${url}" style="color:#3b82f6;">${url}</a>
    </p>`;
}

// ── Divider helper ────────────────────────────────────────────────────────────

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

// ── Re-export APP_URL for use in template builders ────────────────────────────

export { APP_URL };
