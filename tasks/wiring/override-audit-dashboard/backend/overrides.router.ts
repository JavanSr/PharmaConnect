// backend/src/modules/overrides/overrides.router.ts
//
// Mount in backend/src/index.ts:
//   import overridesRouter from './modules/overrides/overrides.router';
//   app.use('/overrides', overridesRouter);

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import {
  listOverrides,
  getOverride,
  flagOverride,
  unflagOverride,
} from './overrides.service';

const router = Router();

// ── Roles allowed to view / act on override audit ─────────────────────────
const AUDIT_ROLES = ['OWNER', 'PHARMACIST_IN_CHARGE', 'ADMIN'];

// ── Tier gate: STANDARD and above (not FREE / ADDO basic) ─────────────────
const ALLOWED_TIERS = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];

function requireAuditAccess(req: Request, res: Response, next: Function) {
  const { subscriptionTier, role } = req.pharmacy as any;

  if (!ALLOWED_TIERS.includes(subscriptionTier)) {
    return res.status(403).json({ error: 'Forbidden: upgrade subscription to access override audit.' });
  }
  if (!AUDIT_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role.' });
  }
  next();
}

// ── GET /overrides ─────────────────────────────────────────────────────────
const listQuerySchema = z.object({
  page:           z.coerce.number().int().min(1).optional(),
  pageSize:       z.coerce.number().int().min(1).max(100).optional(),
  flagged:        z.enum(['true', 'false']).optional(),
  overrideType:   z.enum([
    'INTERACTION_WARNING',
    'STOCK_NEGATIVE',
    'DOSAGE_LIMIT',
    'PRESCRIPTION_REQUIRED',
    'EXPIRY_WARNING',
    'OTHER',
  ]).optional(),
  dispensedById:  z.string().optional(),
  dateFrom:       z.string().optional(),
  dateTo:         z.string().optional(),
});

router.get('/', authenticate, requireAuditAccess, async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const q = parsed.data;
  const result = await listOverrides({
    outletId: (req.pharmacy as any).outletId,
    page:           q.page,
    pageSize:       q.pageSize,
    flagged:        q.flagged === 'true' ? true : q.flagged === 'false' ? false : undefined,
    overrideType:   q.overrideType as any,
    dispensedById:  q.dispensedById,
    dateFrom:       q.dateFrom,
    dateTo:         q.dateTo,
  });

  return res.json({ data: result });
});

// ── GET /overrides/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticate, requireAuditAccess, async (req: Request, res: Response) => {
  const log = await getOverride(req.params.id, (req.pharmacy as any).outletId);
  if (!log) return res.status(404).json({ error: 'Override log entry not found.' });
  return res.json({ data: log });
});

// ── PATCH /overrides/:id/flag ──────────────────────────────────────────────
const flagBodySchema = z.object({
  flagReason: z.string().min(1, 'Flag reason is required'),
});

router.patch('/:id/flag', authenticate, requireAuditAccess, async (req: Request, res: Response) => {
  const parsed = flagBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await flagOverride(
    req.params.id,
    (req.pharmacy as any).outletId,
    (req.pharmacy as any).userId,
    parsed.data.flagReason,
  );

  if (!result) return res.status(404).json({ error: 'Override log entry not found.' });
  return res.json({ data: result });
});

// ── PATCH /overrides/:id/unflag ────────────────────────────────────────────
router.patch('/:id/unflag', authenticate, requireAuditAccess, async (req: Request, res: Response) => {
  const result = await unflagOverride(
    req.params.id,
    (req.pharmacy as any).outletId,
    (req.pharmacy as any).userId,
  );

  if (!result) return res.status(404).json({ error: 'Override log entry not found.' });
  return res.json({ data: result });
});

export default router;
