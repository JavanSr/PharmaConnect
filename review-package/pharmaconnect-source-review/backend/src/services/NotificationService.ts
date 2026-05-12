import { randomUUID } from 'node:crypto';
import { NotificationChannel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type AlertMetadata = Prisma.InputJsonObject;

type InAppInput = {
  pharmacyId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: AlertMetadata;
  referenceId: string;
  referenceType?: string;
  alertType?: string;
};

type ChannelInput = {
  pharmacyId: string;
  referenceId: string;
  referenceType?: string;
  alertType: string;
  recipient?: string | null;
  metadata?: AlertMetadata;
};

type PreferenceRow = {
  inAppEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'PharmaConnect <no-reply@pharmaconnect.tz>';
const africasTalkingApiKey = process.env.AFRICAS_TALKING_API_KEY;
const africasTalkingUsername = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
const whatsappApiUrl = process.env.WHATSAPP_API_URL;
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;

function dayWindow(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function ensureNotificationPreferencesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "notification_preferences" (
      "id" UUID PRIMARY KEY,
      "pharmacy_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "alert_type" TEXT NOT NULL,
      "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
      "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
      "email_enabled" BOOLEAN NOT NULL DEFAULT true,
      "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "notification_preferences_user_alert_type_key" UNIQUE ("user_id", "alert_type")
    )
  `);
}

async function alertExistsToday(
  pharmacyId: string,
  referenceId: string,
  channel: NotificationChannel,
) {
  const { start, end } = dayWindow();
  return prisma.alertLog.findFirst({
    where: {
      pharmacyId,
      referenceId,
      channel,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });
}

async function logAlert(
  input: ChannelInput & {
    channel: NotificationChannel;
    status: string;
    errorMessage?: string | null;
  },
) {
  await prisma.alertLog.create({
    data: {
      pharmacyId: input.pharmacyId,
      referenceId: input.referenceId,
      referenceType: input.referenceType || input.alertType,
      alertType: input.alertType,
      channel: input.channel,
      recipient: input.recipient ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
      sentAt: new Date(),
    },
  });
}

async function readPreference(
  pharmacyId: string,
  userId: string,
  alertType: string,
): Promise<PreferenceRow> {
  await ensureNotificationPreferencesTable();
  const rows = await prisma.$queryRaw<Array<{
    in_app_enabled: boolean;
    sms_enabled: boolean;
    email_enabled: boolean;
    whatsapp_enabled: boolean;
  }>>`
    SELECT
      "in_app_enabled",
      "sms_enabled",
      "email_enabled",
      "whatsapp_enabled"
    FROM "notification_preferences"
    WHERE CAST("pharmacy_id" AS TEXT) = ${pharmacyId}
      AND CAST("user_id" AS TEXT) = ${userId}
      AND "alert_type" = ${alertType}
    LIMIT 1
  `;

  if (rows[0]) {
    return {
      inAppEnabled: rows[0].in_app_enabled,
      smsEnabled: rows[0].sms_enabled,
      emailEnabled: rows[0].email_enabled,
      whatsappEnabled: rows[0].whatsapp_enabled,
    };
  }

  return {
    inAppEnabled: true,
    smsEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
  };
}

function channelEnabled(preference: PreferenceRow, channel: NotificationChannel) {
  if (channel === NotificationChannel.IN_APP) return preference.inAppEnabled;
  if (channel === NotificationChannel.SMS) return preference.smsEnabled;
  if (channel === NotificationChannel.EMAIL) return preference.emailEnabled;
  return preference.whatsappEnabled;
}

export async function getNotificationPreference(
  pharmacyId: string,
  userId: string,
  alertType: string,
) {
  return readPreference(pharmacyId, userId, alertType);
}

export async function upsertNotificationPreference(input: {
  pharmacyId: string;
  userId: string;
  alertType: string;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
}) {
  await ensureNotificationPreferencesTable();

  const existing = await readPreference(input.pharmacyId, input.userId, input.alertType);
  const next = {
    inAppEnabled: input.inAppEnabled ?? existing.inAppEnabled,
    smsEnabled: input.smsEnabled ?? existing.smsEnabled,
    emailEnabled: input.emailEnabled ?? existing.emailEnabled,
    whatsappEnabled: input.whatsappEnabled ?? existing.whatsappEnabled,
  };

  await prisma.$executeRaw`
    INSERT INTO "notification_preferences" (
      "id",
      "pharmacy_id",
      "user_id",
      "alert_type",
      "in_app_enabled",
      "sms_enabled",
      "email_enabled",
      "whatsapp_enabled"
    )
    VALUES (
      ${randomUUID()},
      ${input.pharmacyId},
      ${input.userId},
      ${input.alertType},
      ${next.inAppEnabled},
      ${next.smsEnabled},
      ${next.emailEnabled},
      ${next.whatsappEnabled}
    )
    ON CONFLICT ("user_id", "alert_type")
    DO UPDATE SET
      "in_app_enabled" = EXCLUDED."in_app_enabled",
      "sms_enabled" = EXCLUDED."sms_enabled",
      "email_enabled" = EXCLUDED."email_enabled",
      "whatsapp_enabled" = EXCLUDED."whatsapp_enabled",
      "updated_at" = NOW()
  `;

  return next;
}

export class NotificationService {
  static async sendInApp(input: InAppInput) {
    const existing = await alertExistsToday(input.pharmacyId, input.referenceId, NotificationChannel.IN_APP);
    if (existing) {
      return { sent: false, skipped: true };
    }

    await prisma.notification.create({
      data: {
        pharmacyId: input.pharmacyId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? {},
      },
    });

    await logAlert({
      pharmacyId: input.pharmacyId,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      alertType: input.alertType || input.type,
      channel: NotificationChannel.IN_APP,
      recipient: input.userId,
      metadata: input.metadata,
      status: 'SENT',
    });

    return { sent: true, skipped: false };
  }

  static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    pharmacyId: string,
    referenceId: string,
    alertType: string,
    metadata: AlertMetadata = {},
  ) {
    const existing = await alertExistsToday(pharmacyId, referenceId, NotificationChannel.EMAIL);
    if (existing) {
      return { sent: false, skipped: true };
    }

    if (!resendApiKey) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        metadata,
        status: 'FAILED',
        errorMessage: 'RESEND_NOT_CONFIGURED',
      });
      return { sent: false, skipped: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    try {
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
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        metadata,
        status: 'SENT',
      });

      return { sent: true, skipped: false };
    } catch (error) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        metadata,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
      });
      return { sent: false, skipped: false };
    }
  }

  static async sendSMS(
    phone: string,
    message: string,
    pharmacyId: string,
    referenceId: string,
    alertType: string,
    metadata: AlertMetadata = {},
  ) {
    const existing = await alertExistsToday(pharmacyId, referenceId, NotificationChannel.SMS);
    if (existing) {
      return { sent: false, skipped: true };
    }

    if (!africasTalkingApiKey) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.SMS,
        recipient: phone,
        metadata,
        status: 'FAILED',
        errorMessage: 'AFRICAS_TALKING_NOT_CONFIGURED',
      });
      return { sent: false, skipped: false, reason: 'AFRICAS_TALKING_NOT_CONFIGURED' };
    }

    try {
      const body = new URLSearchParams({
        username: africasTalkingUsername,
        to: phone,
        message,
      });
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey: africasTalkingApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.SMS,
        recipient: phone,
        metadata,
        status: 'SENT',
      });

      return { sent: true, skipped: false };
    } catch (error) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.SMS,
        recipient: phone,
        metadata,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'SMS_SEND_FAILED',
      });
      return { sent: false, skipped: false };
    }
  }

  static async sendWhatsApp(
    phone: string,
    message: string,
    pharmacyId: string,
    referenceId: string,
    alertType: string,
    metadata: AlertMetadata = {},
  ) {
    const existing = await alertExistsToday(pharmacyId, referenceId, NotificationChannel.WHATSAPP);
    if (existing) {
      return { sent: false, skipped: true };
    }

    if (!whatsappApiUrl || !whatsappApiToken) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.WHATSAPP,
        recipient: phone,
        metadata,
        status: 'FAILED',
        errorMessage: 'WHATSAPP_NOT_CONFIGURED',
      });
      return { sent: false, skipped: false, reason: 'WHATSAPP_NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: phone, message }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.WHATSAPP,
        recipient: phone,
        metadata,
        status: 'SENT',
      });

      return { sent: true, skipped: false };
    } catch (error) {
      await logAlert({
        pharmacyId,
        referenceId,
        alertType,
        channel: NotificationChannel.WHATSAPP,
        recipient: phone,
        metadata,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'WHATSAPP_SEND_FAILED',
      });
      return { sent: false, skipped: false };
    }
  }

  static async sendUserAlert(input: {
    pharmacyId: string;
    userId: string;
    email?: string | null;
    phone?: string | null;
    alertType: string;
    referenceId: string;
    title: string;
    body: string;
    metadata?: AlertMetadata;
    channels?: NotificationChannel[];
  }) {
    const preference = await readPreference(input.pharmacyId, input.userId, input.alertType);
    const channels = input.channels ?? [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ];

    const results: Record<string, unknown> = {};

    for (const channel of channels) {
      if (!channelEnabled(preference, channel)) {
        results[channel] = { sent: false, skipped: true, reason: 'CHANNEL_DISABLED' };
        continue;
      }

      if (channel === NotificationChannel.IN_APP) {
        results[channel] = await NotificationService.sendInApp({
          pharmacyId: input.pharmacyId,
          userId: input.userId,
          type: input.alertType,
          title: input.title,
          body: input.body,
          metadata: input.metadata,
          referenceId: input.referenceId,
        });
        continue;
      }

      if (channel === NotificationChannel.EMAIL && input.email) {
        results[channel] = await NotificationService.sendEmail(
          input.email,
          input.title,
          `<p>${input.body}</p>`,
          input.pharmacyId,
          input.referenceId,
          input.alertType,
          input.metadata,
        );
        continue;
      }

      if (channel === NotificationChannel.SMS && input.phone) {
        results[channel] = await NotificationService.sendSMS(
          input.phone,
          input.body,
          input.pharmacyId,
          input.referenceId,
          input.alertType,
          input.metadata,
        );
        continue;
      }

      if (channel === NotificationChannel.WHATSAPP && input.phone) {
        results[channel] = await NotificationService.sendWhatsApp(
          input.phone,
          input.body,
          input.pharmacyId,
          input.referenceId,
          input.alertType,
          input.metadata,
        );
        continue;
      }

      results[channel] = { sent: false, skipped: true, reason: 'RECIPIENT_MISSING' };
    }

    return results;
  }
}
