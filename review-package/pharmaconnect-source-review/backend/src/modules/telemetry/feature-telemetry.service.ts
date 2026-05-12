import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type FeatureTelemetryInput = {
  pharmacyId: string;
  userId: string;
  featureKey: string;
  eventType: 'ACTIVATED' | 'USED';
  metadata?: Record<string, unknown>;
};

export async function trackFeatureTelemetry(input: FeatureTelemetryInput) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "feature_telemetry" (
      "pharmacy_id",
      "feature_key",
      "event_type",
      "metadata",
      "created_by"
    )
    VALUES (
      ${input.pharmacyId},
      ${input.featureKey},
      ${input.eventType},
      ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
      ${input.userId}
    )
  `);
}
