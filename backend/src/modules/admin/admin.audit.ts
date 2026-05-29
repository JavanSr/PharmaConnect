import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { Request } from 'express';

export async function writeAuditLog(input: {
  adminEmail: string;
  action: string;
  targetPharmacyId?: string | null;
  details?: Record<string, unknown> | null;
  req?: Request;
}) {
  const ip = input.req
    ? (input.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      input.req.socket?.remoteAddress ??
      null
    : null;

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "admin_audit_log" ("admin_email", "action", "target_pharmacy_id", "details", "ip_address")
    VALUES (
      ${input.adminEmail},
      ${input.action},
      ${input.targetPharmacyId ?? null},
      ${input.details ? JSON.stringify(input.details) : null}::jsonb,
      ${ip}
    )
  `).catch((err) => console.error('[admin.audit.write.failed]', err));
}
