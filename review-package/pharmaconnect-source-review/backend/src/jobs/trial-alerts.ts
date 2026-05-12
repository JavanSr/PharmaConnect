import cron, { type ScheduledTask } from 'node-cron';
import { NotificationChannel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/NotificationService';

function daysRemaining(trialEndsAt: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trialEnd = new Date(trialEndsAt);
  trialEnd.setHours(0, 0, 0, 0);
  return Math.ceil((trialEnd.getTime() - today.getTime()) / 86_400_000);
}

export async function runTrialAlerts() {
  const owners = await prisma.user.findMany({
    where: {
      role: 'OWNER',
      isActive: true,
      pharmacyId: { not: null },
      pharmacy: {
        status: 'TRIAL',
      },
    },
    include: {
      pharmacy: true,
    },
  });

  let alertsSent = 0;

  for (const owner of owners) {
    if (!owner.pharmacyId || !owner.pharmacy) {
      continue;
    }

    const remaining = daysRemaining(owner.pharmacy.trialEndsAt);
    let alertType: string | null = null;
    let channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    let title = '';
    let body = '';

    if (remaining === 7) {
      alertType = 'TRIAL_ENDING_7_DAYS';
      channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
      title = 'Trial ends in 7 days';
      body = `Your PharmaConnect trial for ${owner.pharmacy.name} ends in 7 days. Contact the founder to avoid interruption.`;
    } else if (remaining === 1) {
      alertType = 'TRIAL_ENDING_1_DAY';
      channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS];
      title = 'Trial ends tomorrow';
      body = `Your PharmaConnect trial for ${owner.pharmacy.name} ends tomorrow. Payment confirmation restores access within 24 hours.`;
    } else if (remaining < 0 && owner.pharmacy.trialActive) {
      alertType = 'TRIAL_EXPIRED';
      channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
      title = 'Trial has ended';
      body = `Your PharmaConnect trial for ${owner.pharmacy.name} has ended. Access remains blocked until payment is confirmed.`;
      await prisma.pharmacy.update({
        where: { id: owner.pharmacyId },
        data: { trialActive: false },
      });
    }

    if (!alertType) {
      continue;
    }

    const result = await NotificationService.sendUserAlert({
      pharmacyId: owner.pharmacyId,
      userId: owner.id,
      email: owner.email,
      phone: owner.phone,
      alertType,
      referenceId: `${owner.pharmacyId}:${alertType}`,
      title,
      body,
      metadata: {
        pharmacyId: owner.pharmacyId,
        trialEndsAt: owner.pharmacy.trialEndsAt.toISOString(),
        daysRemaining: remaining,
      },
      channels,
    });

    if (Object.values(result).some((entry: any) => entry?.sent)) {
      alertsSent += 1;
    }
  }

  return { alertsSent };
}

export function registerTrialAlertsJob(): ScheduledTask {
  return cron.schedule('0 7 * * *', async () => {
    try {
      const result = await runTrialAlerts();
      console.log(`[trial-alerts] sent ${result.alertsSent} trial alert bundles`);
    } catch (error) {
      console.error('[trial-alerts] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}
