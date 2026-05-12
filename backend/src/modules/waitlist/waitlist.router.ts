import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'APOTEKH <no-reply@apotekh.co.tz>';

async function sendWaitlistConfirmation(email: string, feature: string) {
  if (!resendApiKey) {
    return { sent: false, reason: 'RESEND_NOT_CONFIGURED' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: `APOTEKH waitlist confirmation: ${feature}`,
      html: `
        <div style="font-family: DM Sans, Arial, sans-serif; color: #0D4035; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">You are on the waitlist</h2>
          <p>We have recorded your interest in <strong>${feature}</strong>.</p>
          <p>We will contact you when the dependency blocking this feature changes.</p>
          <p style="margin-top: 24px;">APOTEKH</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(new Error(`WAITLIST_EMAIL_FAILED: ${errorText}`), { status: 502 });
  }

  return { sent: true };
}

export const waitlistRouter = Router();

waitlistRouter.post('/', async (req, res, next) => {
  try {
    const payload = z.object({
      email: z.string().email(),
      feature: z.string().min(3).max(120),
    }).parse(req.body);

    const rows = await prisma.$queryRaw<Array<{ id: string; email: string; feature: string; signed_up_at: Date }>>`
      INSERT INTO "waitlist" ("email", "feature")
      VALUES (${payload.email.toLowerCase()}, ${payload.feature})
      ON CONFLICT ("email", "feature")
      DO UPDATE SET "signed_up_at" = CURRENT_TIMESTAMP
      RETURNING "id", "email", "feature", "signed_up_at"
    `;

    const emailStatus = await sendWaitlistConfirmation(payload.email.toLowerCase(), payload.feature);

    res.status(201).json({
      data: {
        ...rows[0],
        confirmationEmail: emailStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});
