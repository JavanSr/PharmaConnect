import { Router } from 'express';
import { z } from 'zod';
import { authenticate, assertUser, requireRole, type AuthRequest } from '../../middleware/auth';
import { signAccess } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';
import { writeAuditLog } from './admin.audit';
import * as svc from './admin.service';

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('SUPER_ADMIN'));

const uid = (req: AuthRequest) => assertUser(req).userId;
const email = (req: AuthRequest) => assertUser(req).email;

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

// ─── Membership repair ────────────────────────────────────────────────────────
// Fixes "no pharmacy" when a user account exists but has no PharmacyMembership.

adminRouter.post('/pharmacies/:id/memberships', async (req: AuthRequest, res, next) => {
  try {
    const { userEmail, role } = z.object({
      userEmail: z.string().email(),
      // PharmacyMembershipRole enum — only these exist in the schema
      role: z.enum(['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER']),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, email: true } });
    if (!user) throw Object.assign(new Error(`No user found with email ${userEmail}`), { status: 404 });

    // Upsert: reactivate an existing (inactive) membership, or create a new one.
    // The unique constraint is (userId, pharmacyId) so we can't create a second row.
    await prisma.pharmacyMembership.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId: req.params.id } } as any,
      create: {
        pharmacyId: req.params.id,
        userId: user.id,
        role: role as any,
        active: true,
        validFrom: new Date(),
      },
      update: {
        role: role as any,
        active: true,
        validFrom: new Date(),
        validUntil: null,
      },
    });

    await writeAuditLog({
      adminEmail: email(req), action: 'ADD_MEMBERSHIP',
      targetPharmacyId: req.params.id,
      details: { userEmail, role },
      req,
    });

    res.status(201).json({ data: { linked: true, userEmail, role } });
  } catch (e) { next(e); }
});

adminRouter.get('/pharmacies/:id/memberships', async (req: AuthRequest, res, next) => {
  try {
    const memberships = await prisma.pharmacyMembership.findMany({
      where: { pharmacyId: req.params.id },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      data: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        role: m.role,
        active: m.active,
        validFrom: m.validFrom,
        validUntil: m.validUntil,
      })),
    });
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

// ─── Knowledge Hub CMS ───────────────────────────────────────────────────────

const articleSchema = z.object({
  title:              z.string().min(3).max(255),
  summary:            z.string().max(500).optional(),
  htmlContent:        z.string().optional(),
  category:           z.enum(['DRUG_SAFETY','REGULATORY','CLINICAL','BUSINESS','TECHNOLOGY','CPD','GENERAL']).optional(),
  tags:               z.array(z.string()).optional(),
  readingTimeMinutes: z.coerce.number().int().min(1).max(120).optional(),
  isSponsored:        z.boolean().optional(),
  sponsorName:        z.string().max(120).nullable().optional(),
});

// List all articles (including unpublished)
adminRouter.get('/knowledge/articles', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.article.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, slug: true, title: true, summary: true, category: true,
        tags: true, isPublished: true, isSponsored: true, sponsorName: true,
        readingTimeMinutes: true, viewCount: true, publishedAt: true, createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

// Get single article (full content)
adminRouter.get('/knowledge/articles/:id', async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ data: article });
  } catch (e) { next(e); }
});

// Create article
adminRouter.post('/knowledge/articles', async (req: AuthRequest, res, next) => {
  try {
    const body = articleSchema.parse(req.body);
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80)
      + '-' + Date.now();

    const article = await prisma.article.create({
      data: {
        slug,
        title:              body.title,
        summary:            body.summary ?? null,
        category:           (body.category as any) ?? 'GENERAL',
        tags:               body.tags ?? [],
        readingTimeMinutes: body.readingTimeMinutes ?? 5,
        isSponsored:        body.isSponsored ?? false,
        sponsorName:        body.sponsorName ?? null,
        isPublished:        false,
        authorId:           uid(req),
        ...(body.htmlContent ? { htmlContent: body.htmlContent } as any : {}),
      },
    });

    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_ARTICLE_CREATED', details: { articleId: article.id, title: article.title }, req });
    res.status(201).json({ data: article });
  } catch (e) { next(e); }
});

// Update article
adminRouter.patch('/knowledge/articles/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = articleSchema.partial().parse(req.body);
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(body.title              !== undefined ? { title: body.title }                           : {}),
        ...(body.summary            !== undefined ? { summary: body.summary }                       : {}),
        ...(body.category           !== undefined ? { category: body.category as any }              : {}),
        ...(body.tags               !== undefined ? { tags: body.tags }                             : {}),
        ...(body.readingTimeMinutes !== undefined ? { readingTimeMinutes: body.readingTimeMinutes } : {}),
        ...(body.isSponsored        !== undefined ? { isSponsored: body.isSponsored }               : {}),
        ...(body.sponsorName        !== undefined ? { sponsorName: body.sponsorName }               : {}),
        ...(body.htmlContent        !== undefined ? { htmlContent: body.htmlContent } as any        : {}),
      },
    });
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_ARTICLE_UPDATED', details: { articleId: article.id }, req });
    res.json({ data: article });
  } catch (e) { next(e); }
});

// Publish / unpublish
adminRouter.post('/knowledge/articles/:id/publish', async (req: AuthRequest, res, next) => {
  try {
    const { publish } = z.object({ publish: z.boolean() }).parse(req.body);
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { isPublished: publish, publishedAt: publish ? new Date() : null },
    });
    await writeAuditLog({ adminEmail: email(req), action: publish ? 'KNOWLEDGE_ARTICLE_PUBLISHED' : 'KNOWLEDGE_ARTICLE_UNPUBLISHED', details: { articleId: article.id, title: article.title }, req });
    res.json({ data: article });
  } catch (e) { next(e); }
});

// Delete article
adminRouter.delete('/knowledge/articles/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.article.delete({ where: { id: req.params.id } });
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_ARTICLE_DELETED', details: { articleId: req.params.id }, req });
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});

// ── Bulletins ─────────────────────────────────────────────────────────────────

const bulletinSchema = z.object({
  title:    z.string().min(3).max(255),
  body:     z.any().optional(),
  isUrgent: z.boolean().optional(),
});

adminRouter.get('/knowledge/bulletins', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "bulletins" ORDER BY "created_at" DESC LIMIT 100
    `;
    res.json({ data: rows });
  } catch (e) { next(e); }
});

adminRouter.post('/knowledge/bulletins', async (req: AuthRequest, res, next) => {
  try {
    const body = bulletinSchema.parse(req.body);
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "bulletins" ("title","body","is_urgent","is_published","published_at")
      VALUES (${body.title}, ${JSON.stringify(body.body ?? {})}::jsonb, ${body.isUrgent ?? false}, true, NOW())
      RETURNING *
    `;
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_BULLETIN_CREATED', details: { title: body.title }, req });
    res.status(201).json({ data: rows[0] });
  } catch (e) { next(e); }
});

adminRouter.patch('/knowledge/bulletins/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = bulletinSchema.partial().parse(req.body);
    const sets: string[] = [];
    if (body.title     !== undefined) sets.push(`"title" = '${body.title.replace(/'/g, "''")}'`);
    if (body.isUrgent  !== undefined) sets.push(`"is_urgent" = ${body.isUrgent}`);
    if (!sets.length) { res.status(400).json({ error: 'Nothing to update' }); return; }
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "bulletins" SET ${sets.join(', ')} WHERE "id" = $1 RETURNING *`,
      req.params.id,
    );
    res.json({ data: rows[0] });
  } catch (e) { next(e); }
});

adminRouter.delete('/knowledge/bulletins/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.$executeRaw`DELETE FROM "bulletins" WHERE "id" = ${req.params.id}`;
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_BULLETIN_DELETED', details: { bulletinId: req.params.id }, req });
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});

// ─── User Article Submission Review ──────────────────────────────────────────

// List all user-submitted articles (pending and all)
adminRouter.get('/knowledge/submissions', async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['DRAFT','PENDING_REVIEW','APPROVED','REJECTED']).optional(),
    }).parse(req.query);

    const rows = await prisma.article.findMany({
      where: {
        submittedByUserId: { not: null },
        ...(status ? { submissionStatus: status } : {}),
      },
      orderBy: [{ submissionStatus: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true, slug: true, title: true, summary: true, category: true,
        htmlContent: true, submissionStatus: true, rejectionNote: true,
        authorBio: true, viewCount: true, isPublished: true,
        publishedAt: true, createdAt: true, updatedAt: true,
        submittedBy: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
      },
    });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

// Approve a submission → publishes it
adminRouter.post('/knowledge/submissions/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.submittedByUserId) { res.status(404).json({ error: 'Submission not found' }); return; }

    const { readingTimeMinutes } = z.object({
      readingTimeMinutes: z.coerce.number().int().min(1).max(120).optional(),
    }).parse(req.body);

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        submissionStatus:   'APPROVED',
        rejectionNote:      null,
        isPublished:        true,
        publishedAt:        new Date(),
        // The submitter is the visible author — set authorId to submittedByUserId
        authorId:           existing.submittedByUserId,
        readingTimeMinutes: readingTimeMinutes ?? existing.readingTimeMinutes,
      },
    });
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_SUBMISSION_APPROVED', details: { articleId: article.id, title: article.title }, req });
    res.json({ data: article });
  } catch (e) { next(e); }
});

// Reject a submission with optional feedback
adminRouter.post('/knowledge/submissions/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.submittedByUserId) { res.status(404).json({ error: 'Submission not found' }); return; }

    const { note } = z.object({ note: z.string().max(500).optional() }).parse(req.body);

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        submissionStatus: 'REJECTED',
        rejectionNote:    note ?? null,
        isPublished:      false,
      },
    });
    await writeAuditLog({ adminEmail: email(req), action: 'KNOWLEDGE_SUBMISSION_REJECTED', details: { articleId: article.id, note }, req });
    res.json({ data: article });
  } catch (e) { next(e); }
});

// ─── Me (verify super-admin session) ─────────────────────────────────────────

adminRouter.get('/me', (req: AuthRequest, res) => {
  res.json({ data: { userId: uid(req), email: email(req), role: assertUser(req).role } });
});
