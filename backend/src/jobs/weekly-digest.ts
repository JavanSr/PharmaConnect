import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'APOTEKH <no-reply@apotekh.co.tz>';

async function sendDigestEmail(to: string, subject: string, html: string) {
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
      from: resendFromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return { sent: true };
}

export async function runWeeklyDigest(): Promise<{ attempted: number; sent: number }> {
  const subscribers = await prisma.$queryRaw<Array<{ email: string; unsubscribe_token: string }>>`
    SELECT "email", "unsubscribe_token"
    FROM "email_subscribers"
    WHERE "is_active" = true
    ORDER BY "subscribed_at" DESC
  `;

  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  });

  const bulletins = await prisma.$queryRaw<Array<{ title: string }>>`
    SELECT "title"
    FROM "bulletins"
    WHERE "is_published" = true
    ORDER BY "is_urgent" DESC, "published_at" DESC NULLS LAST, "created_at" DESC
    LIMIT 3
  `;

  let sent = 0;
  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: DM Sans, Arial, sans-serif; color: #0D4035; line-height: 1.6;">
        <h2>APOTEKH Weekly Digest</h2>
        <p>Latest articles</p>
        <ul>${articles.map((article) => `<li><strong>${article.title}</strong></li>`).join('')}</ul>
        <p>Urgent bulletins</p>
        <ul>${bulletins.map((bulletin) => `<li>${bulletin.title}</li>`).join('')}</ul>
        <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/api/v1/knowledge/unsubscribe/${subscriber.unsubscribe_token}">Unsubscribe</a></p>
      </div>
    `;

    try {
      const result = await sendDigestEmail(subscriber.email, 'APOTEKH Weekly Digest', html);
      if (result.sent) {
        sent += 1;
      }
    } catch (error) {
      console.error('[weekly-digest] email failed', error);
    }
  }

  return {
    attempted: subscribers.length,
    sent,
  };
}

export function registerWeeklyDigestJob(): ScheduledTask {
  return cron.schedule('0 7 * * 1', async () => {
    try {
      const result = await runWeeklyDigest();
      console.log(`[weekly-digest] attempted ${result.attempted}, sent ${result.sent}`);
    } catch (error) {
      console.error('[weekly-digest] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}
