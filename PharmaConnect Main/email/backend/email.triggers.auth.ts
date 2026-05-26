// backend/src/modules/auth/auth.email.ts
//
// Drop these calls into the relevant auth router/service functions.
// Search for the existing password reset logic and add sendEmail() there.
//
// ── Integration points ───────────────────────────────────────────────────────
//
//   1. POST /auth/forgot-password
//      After generating resetToken and saving to DB, call:
//        await sendPasswordResetEmail(user.email, user.name, resetToken);
//
//   2. POST /auth/register  (or wherever pharmacy onboarding completes)
//      After pharmacy + user are created, call:
//        await sendWelcomeEmail(user.email, user.name, pharmacy.name);

import { sendEmail }                           from '../email/email.service';
import { passwordResetEmail, welcomeEmail }    from '../email/email.templates';

export async function sendPasswordResetEmail(
  to:           string,
  name:         string,
  resetToken:   string,
): Promise<void> {
  const { subject, html } = passwordResetEmail({ recipientName: name, resetToken });
  await sendEmail({ to, subject, html });
}

export async function sendWelcomeEmail(
  to:           string,
  name:         string,
  pharmacyName: string,
): Promise<void> {
  const { subject, html } = welcomeEmail({ recipientName: name, pharmacyName });
  await sendEmail({ to, subject, html });
}
