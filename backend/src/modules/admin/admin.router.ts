import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { signAccess } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';
import { writeAuditLog } from './admin.audit';
import * as svc from './admin.service';

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('SUPER_ADMIN'));

const uid = (req: AuthRequest) => req.user!.userId;
const email = (req: AuthRequest) => req.user!.email;

// ─── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get('/dashboard/metrics', async (_req, res, next) => {
  try {
    res.json({ data: await svc.getDashboardMetrics() });
  } catch (e) { next(e); }
});

adminRouter.get('/dashboard/at-risk', async (_req, res, next) => {
  try {
    res.json({ data: await svc.getAtRiskPharmacies() });
  } catch (e) { next(e); }
});

// ─── Pharmacy list ────────────────────────────────────────────────────────────

adminRouter.get('/pharmacies', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      search:   z.string().optional(),
      tier:     z.string().optional(),
      status:   z.string().optional(),
      region:   z.string().optional(),
      page:     z.coerce.number().int().positive().optional(),
      limit:    z.coerce.number().int().positive().optional(),
    }).parse(req.query);
    res.json({ data: await svc.listPharmacies(params) });
  } catch (e) { next(e); }
});

adminRouter.get('/pharmacies/export-csv', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      search: z.string().optional(),
      tier: z.string().optional(),
      status: z.string().optional(),
      region: z.string().optional(),
    }).parse(req.query);
    const result = await svc.listPharmacies({ ...params, page: 1, limit: 10000 });

    const header = ['id','name','region','tier','status','ownerName','ownerEmail','ownerPhone','lastLogin','onboardedAt','activityHealth'];
    const rows = result.data.map((r) => [
      r.id, r.name, r.region, r.tier, r.status,
      r.ownerName ?? '', r.ownerEmail ?? '', r.ownerPhone ?? '',
      r.lastLogin ?? '', r.onboardedAt, r.activityHealth,
    ]);

    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pharmacies.csv');
    res.send(csv);

    await writeAuditLog({ adminEmail: email(req), action: 'EXPORT_PHARMACIES_CSV', req });
  } catch (e) { next(e); }
});

// ─── Pharmacy detail ──────────────────────────────────────────────────────────

adminRouter.get('/pharmacies/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.getPharmacyDetail(req.params.id) });
  } catch (e) { next(e); }
});

adminRouter.patch('/pharmacies/:id/tier', async (req: AuthRequest, res, next) => {
  try {
    const { tier, paidUntil } = z.object({
      tier:      z.enum(['ADDO','ESSENTIAL','ADDO_PLUS','STANDARD','PREMIUM','WHOLESALE','ENTERPRISE']),
      paidUntil: z.coerce.date().optional().nullable(),
    }).parse(req.body);

    const updated = await svc.setPharmacyTier(req.params.id, tier, paidUntil);
    await writeAuditLog({ adminEmail: email(req), action: 'TIER_CHANGE', targetPharmacyId: req.params.id, details: { tier, paidUntil }, req });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

adminRouter.patch('/pharmacies/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['ACTIVE','TRIAL','GRACE','SUSPENDED','CANCELLED']),
    }).parse(req.body);

    const updated = await svc.setPharmacyStatus(req.params.id, status);
    await writeAuditLog({ adminEmail: email(req), action: 'STATUS_CHANGE', targetPharmacyId: req.params.id, details: { status }, req });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

adminRouter.patch('/pharmacies/:id/expiry', async (req: AuthRequest, res, next) => {
  try {
    const { expiresAt } = z.object({ expiresAt: z.coerce.date() }).parse(req.body);
    const updated = await svc.setPharmacyExpiry(req.params.id, expiresAt);
    await writeAuditLog({ adminEmail: email(req), action: 'EXPIRY_SET', targetPharmacyId: req.params.id, details: { expiresAt }, req });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

adminRouter.patch('/pharmacies/:id/notes', async (req: AuthRequest, res, next) => {
  try {
    const { notes } = z.object({ notes: z.string().max(2000).nullable() }).parse(req.body);
    await svc.setPharmacyNotes(req.params.id, notes);
    await writeAuditLog({ adminEmail: email(req), action: 'NOTES_UPDATED', targetPharmacyId: req.params.id, req });
    res.json({ data: { updated: true } });
  } catch (e) { next(e); }
});

// ─── Payments ────────────────────────────────────────────────────────────────

adminRouter.post('/pharmacies/:id/payments', async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      amountTzs:   z.coerce.number().int().positive(),
      paymentDate: z.coerce.date(),
      method:      z.enum(['mpesa','cash','bank','cheque','other']),
      reference:   z.string().max(200).optional().nullable(),
      notes:       z.string().max(500).optional().nullable(),
    }).parse(req.body);

    const payment = await svc.logPayment({
      pharmacyId: req.params.id,
      loggedBy: email(req),
      ...payload,
    });
    await writeAuditLog({
      adminEmail: email(req), action: 'PAYMENT_LOGGED',
      targetPharmacyId: req.params.id,
      details: { amountTzs: payload.amountTzs, method: payload.method, reference: payload.reference },
      req,
    });
    res.status(201).json({ data: payment });
  } catch (e) { next(e); }
});

adminRouter.get('/pharmacies/:id/payments', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await svc.listPayments(req.params.id) });
  } catch (e) { next(e); }
});

// ─── Usage metrics ────────────────────────────────────────────────────────────

adminRouter.get('/pharmacies/:id/usage', async (_req, res, next) => {
  try {
    res.json({ data: await svc.getPharmacyUsage(_req.params.id) });
  } catch (e) { next(e); }
});

// ─── Impersonation ────────────────────────────────────────────────────────────

adminRouter.post('/pharmacies/:id/impersonate', async (req: AuthRequest, res, next) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true },
    });
    if (!pharmacy) throw Object.assign(new Error('Pharmacy not found'), { status: 404 });

    const ownerMembership = await prisma.pharmacyMembership.findFirst({
      where: { pharmacyId: req.params.id, role: 'OWNER', active: true },
      select: { userId: true, user: { select: { role: true, firstName: true, lastName: true } } },
    });
    if (!ownerMembership) throw Object.assign(new Error('No active owner found'), { status: 404 });

    const token = signAccess({
      userId: ownerMembership.userId,
      role: ownerMembership.user.role,
      pharmacyId: req.params.id,
    });

    await writeAuditLog({
      adminEmail: email(req), action: 'IMPERSONATE',
      targetPharmacyId: req.params.id,
      details: { pharmacyName: pharmacy.name, ownerUserId: ownerMembership.userId },
      req,
    });

    res.json({
      data: {
        token,
        pharmacyId: req.params.id,
        pharmacyName: pharmacy.name,
        ownerName: `${ownerMembership.user.firstName} ${ownerMembership.user.lastName}`,
      },
    });
  } catch (e) { next(e); }
});

// ─── Reset staff PIN ──────────────────────────────────────────────────────────

adminRouter.post('/pharmacies/:id/reset-pin/:userId', async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.userId }, data: { picPinHash: null } });
    await writeAuditLog({
      adminEmail: email(req), action: 'RESET_PIN',
      targetPharmacyId: req.params.id,
      details: { userId: req.params.userId },
      req,
    });
    res.json({ data: { reset: true } });
  } catch (e) { next(e); }
});

// ─── Audit log ────────────────────────────────────────────────────────────────

adminRouter.get('/audit', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      page:        z.coerce.number().int().positive().optional(),
      limit:       z.coerce.number().int().positive().optional(),
      action:      z.string().optional(),
      adminEmail:  z.string().optional(),
      pharmacyId:  z.string().optional(),
      from:        z.coerce.date().optional(),
      to:          z.coerce.date().optional(),
    }).parse(req.query);
    res.json({ data: await svc.listAuditLog(params) });
  } catch (e) { next(e); }
});

adminRouter.get('/audit/export', async (req: AuthRequest, res, next) => {
  try {
    const result = await svc.listAuditLog({ limit: 10000 });
    const header = ['id','adminEmail','action','pharmacyName','ipAddress','details','createdAt'];
    const rows = result.data.map((r) => [
      r.id, r.adminEmail, r.action, r.pharmacyName ?? '',
      r.ipAddress ?? '', JSON.stringify(r.details ?? {}), r.createdAt,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (e) { next(e); }
});

// ─── Feature flags ────────────────────────────────────────────────────────────

adminRouter.get('/feature-flags', async (_req, res, next) => {
  try {
    res.json({ data: await svc.listFeatureFlags() });
  } catch (e) { next(e); }
});

adminRouter.patch('/feature-flags/:pharmacyId/:featureKey', async (req: AuthRequest, res, next) => {
  try {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    await svc.setFeatureFlag(req.params.pharmacyId, req.params.featureKey, enabled, email(req));
    await writeAuditLog({
      adminEmail: email(req), action: 'FEATURE_FLAG_CHANGE',
      targetPharmacyId: req.params.pharmacyId,
      details: { featureKey: req.params.featureKey, enabled },
      req,
    });
    res.json({ data: { updated: true } });
  } catch (e) { next(e); }
});

adminRouter.post('/feature-flags/reset/:pharmacyId', async (req: AuthRequest, res, next) => {
  try {
    await svc.resetPharmacyFlags(req.params.pharmacyId);
    await writeAuditLog({
      adminEmail: email(req), action: 'FEATURE_FLAGS_RESET',
      targetPharmacyId: req.params.pharmacyId, req,
    });
    res.json({ data: { reset: true } });
  } catch (e) { next(e); }
});

adminRouter.get('/feature-flags/global', async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ feature_key: string; enabled: boolean; updated_by: string | null; updated_at: Date }>>`
      SELECT * FROM "global_feature_flags" ORDER BY feature_key ASC
    `;
    res.json({ data: rows.map((r) => ({ featureKey: r.feature_key, enabled: r.enabled, updatedBy: r.updated_by, updatedAt: r.updated_at.toISOString() })) });
  } catch (e) { next(e); }
});

adminRouter.patch('/feature-flags/global/:featureKey', async (req: AuthRequest, res, next) => {
  try {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    await svc.setGlobalFlag(req.params.featureKey, enabled, email(req));
    const affected = await prisma.pharmacy.count({ where: { isActive: true } });
    await writeAuditLog({
      adminEmail: email(req), action: 'GLOBAL_FLAG_CHANGE',
      details: { featureKey: req.params.featureKey, enabled, affectedPharmacies: affected },
      req,
    });
    res.json({ data: { updated: true, affectedPharmacies: affected } });
  } catch (e) { next(e); }
});

// ─── Messages ────────────────────────────────────────────────────────────────

adminRouter.post('/messages/send', async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      body: z.string().min(1).max(500),
      filter: z.object({
        type: z.enum(['all','status','tier','activity_health','pharmacy_ids']),
        value: z.string().optional(),
        pharmacyIds: z.array(z.string()).optional(),
      }),
    }).parse(req.body);

    const result = await svc.sendAdminMessage({ sentBy: email(req), filter: payload.filter, body: payload.body });
    await writeAuditLog({
      adminEmail: email(req), action: 'MESSAGE_SENT',
      details: { filter: payload.filter, recipientCount: result.recipientCount, preview: payload.body.slice(0, 80) },
      req,
    });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

adminRouter.get('/messages', async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      page:  z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    }).parse(req.query);
    res.json({ data: await svc.listAdminMessages(params) });
  } catch (e) { next(e); }
});

// ─── Me (verify super-admin session) ─────────────────────────────────────────

adminRouter.get('/me', (req: AuthRequest, res) => {
  res.json({ data: { userId: uid(req), email: email(req), role: req.user!.role } });
});
