import cron, { type ScheduledTask } from 'node-cron';
import { ensureChecklistTemplatesSeeded, refreshComplianceStatuses, runComplianceAlerts } from '../modules/compliance/compliance.service';

export async function runComplianceHealthScores(): Promise<{ updated: number }> {
  await ensureChecklistTemplatesSeeded();
  const updated = await refreshComplianceStatuses();
  return { updated };
}

export function registerComplianceAlertsJob(): ScheduledTask {
  return cron.schedule('0 6 * * *', async () => {
    try {
      await ensureChecklistTemplatesSeeded();
      const result = await runComplianceAlerts();
      console.log(`[compliance-alerts] queued ${result.queued} alerts`);
    } catch (error) {
      console.error('[compliance-alerts] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}

export function registerComplianceHealthJob(): ScheduledTask {
  return cron.schedule('15 0 * * *', async () => {
    try {
      await ensureChecklistTemplatesSeeded();
      const result = await runComplianceHealthScores();
      console.log(`[compliance-health] refreshed ${result.updated} items`);
    } catch (error) {
      console.error('[compliance-health] failed', error);
    }
  }, {
    timezone: 'Africa/Nairobi',
  });
}
