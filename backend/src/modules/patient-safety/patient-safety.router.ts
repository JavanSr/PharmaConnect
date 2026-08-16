import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { authenticate, assertUser, hasRoleAccess, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
// picPinLimiter / requirePicPin removed — CLAUDE.md: dispenser overrides at own risk,
// no Superintendent PIN required, no escalation. Override is logged against the dispenser.
import {
  calculateDose,
  createOverrideLog,
  getDrugDetails,
  getStewardshipSuggestion,
  isStewardshipIndication,
  matchDiagnosis,
  searchReviewedDrugs,
  sessionReview,
  checkInteractions,
  checkContraindications,
} from './patient-safety.service';
import { getCounsellingSuggestions } from './ai-counselling.service';
import { trackFeatureTelemetry } from '../telemetry/feature-telemetry.service';

const ACCESS_ROLES = ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'SUPER_ADMIN'];

function requirePatientSafetyAccess(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.normalizedRole === 'SUPER_ADMIN') {
    next();
    return;
  }

  if (!req.user.pharmacyId) {
    res.status(400).json({ error: 'Pharmacy context required' });
    return;
  }

  if (!hasRoleAccess(req.user.role, ACCESS_ROLES)) {
    res.status(403).json({ error: 'ROLE_INSUFFICIENT', allowedRoles: ACCESS_ROLES });
    return;
  }

  next();
}

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

const sessionSchema = z.object({
  productIds: z.array(z.string()).optional(),
  medicines: z.array(z.string()).optional(),
  pregnant: z.boolean().optional(),
  breastfeeding: z.boolean().optional(),
  ageYears: z.number().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  allergies: z.array(z.string()).optional(),
  diagnoses: z.array(z.string()).optional(),
  renalImpairment: z.boolean().optional(),
  hepaticImpairment: z.boolean().optional(),
});

export const patientSafetyRouter = Router();
patientSafetyRouter.use(authenticate);
patientSafetyRouter.use(enforceTrialRestrictions);
patientSafetyRouter.use(requirePatientSafetyAccess);

patientSafetyRouter.get('/drugs/search', async (req, res, next) => {
  try {
    const { q, limit = '10' } = z.object({
      q: z.string().min(1),
      limit: z.string().optional(),
    }).parse(req.query);

    const data = await searchReviewedDrugs(q, Number(limit));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.get('/drugs/details', async (req, res, next) => {
  try {
    const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
    const data = await getDrugDetails(q);
    if (!data) {
      res.status(404).json({ error: 'Drug not found' });
      return;
    }
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Non-blocking AMR stewardship suggestion — called when a dispenser voluntarily
// selects an indication for a WATCH/RESERVE antibiotic. Returns null (not a 404)
// when no reviewed alternative exists so the frontend can render nothing.
patientSafetyRouter.get('/stewardship-suggestion', async (req, res, next) => {
  try {
    const { genericName, indication } = z.object({
      genericName: z.string().min(1),
      indication: z.string(),
    }).parse(req.query);

    if (!isStewardshipIndication(indication)) {
      res.json({ data: null });
      return;
    }

    const data = await getStewardshipSuggestion(genericName, indication);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/check-interactions', async (req, res, next) => {
  try {
    const data = await checkInteractions(sessionSchema.parse(req.body));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/check-contraindications', async (req, res, next) => {
  try {
    const data = await checkContraindications(sessionSchema.parse(req.body));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/calculate-dose', async (req, res, next) => {
  try {
    const payload = z.object({
      adultDoseMg: z.number().positive(),
      ageYears: z.number().nonnegative().optional(),
      weightKg: z.number().positive().optional(),
      recommendedMgPerKg: z.union([z.number().positive(), z.string().trim().min(1)]).optional(),
    }).parse(req.body);
    res.json({ data: calculateDose(payload) });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/match-diagnosis', async (req, res, next) => {
  try {
    const payload = z.object({
      diagnosis: z.string().min(1),
      limit: z.number().int().positive().optional(),
    }).parse(req.body);
    const data = await matchDiagnosis(payload);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/session-review', async (req, res, next) => {
  try {
    const data = await sessionReview(sessionSchema.parse(req.body));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.post('/counselling-suggestions', async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      triggers: z.array(z.object({
        rule: z.string().min(1),
        severity: z.string().min(1),
        drug: z.string().min(1),
        flags: z.array(z.string()).default([]),
      })).min(1),
    }).parse(req.body);

    const data = await getCounsellingSuggestions({
      pharmacyId: pid(req),
      userId: assertUser(req).userId,
      triggers: payload.triggers,
    });

    await trackFeatureTelemetry({
      pharmacyId: pid(req),
      userId: assertUser(req).userId,
      featureKey: 'ai_counselling',
      eventType: 'USED',
      metadata: {
        triggerCount: payload.triggers.length,
      },
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

patientSafetyRouter.get('/override-log', async (req: AuthRequest, res, next) => {
  try {
    const { page, limit } = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);

    const skip = (page - 1) * limit;
    const pharmacyId = pid(req);

    const [logs, total] = await Promise.all([
      prisma.overrideLog.findMany({
        where: { pharmacyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          alertType: true,
          reason: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, role: true } },
          picUser: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.overrideLog.count({ where: { pharmacyId } }),
    ]);

    res.json({ data: logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

// No PIC PIN gate — dispenser proceeds at own risk and is accountable via this log.
patientSafetyRouter.post('/override', async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      alertType: z.string().min(1),
      reason: z.string().min(5),
      interactionId: z.string().optional(),
      contraindicationId: z.string().optional(),
      details: z.record(z.unknown()).optional(),
    }).parse(req.body);

    const data = await createOverrideLog({
      pharmacyId: pid(req),
      userId: assertUser(req).userId,
      picUserId: undefined,   // no PIC approval required per product design
      alertType: payload.alertType,
      reason: payload.reason,
      interactionId: payload.interactionId,
      contraindicationId: payload.contraindicationId,
      payload: (payload.details ?? {}) as Prisma.JsonObject,
    });

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});
