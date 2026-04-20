import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { authenticate, hasRoleAccess, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { requirePicPin } from '../../middleware/pic-pin';
import { normalizeTier } from '../../types/roles';
import {
  calculateDose,
  createOverrideLog,
  getDrugDetails,
  matchDiagnosis,
  searchReviewedDrugs,
  sessionReview,
  checkInteractions,
  checkContraindications,
} from './patient-safety.service';

const ACCESS_TIERS = new Set(['STANDARD', 'PREMIUM', 'ENTERPRISE']);
const ACCESS_ROLES = ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'SUPER_ADMIN'];

function requirePatientSafetyAccess(req: AuthRequest, res: any, next: any) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const currentTier = normalizeTier(req.user.pharmacy?.subscriptionTier ?? null);
  if (!currentTier || !ACCESS_TIERS.has(currentTier)) {
    res.status(403).json({
      error: 'TIER_INSUFFICIENT',
      current: currentTier,
      required: 'STANDARD',
    });
    return;
  }

  if (!hasRoleAccess(req.user.role, ACCESS_ROLES)) {
    res.status(403).json({ error: 'ROLE_INSUFFICIENT', allowedRoles: ACCESS_ROLES });
    return;
  }

  next();
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
      recommendedMgPerKg: z.number().positive().optional(),
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

patientSafetyRouter.post('/override', requirePicPin, async (req: AuthRequest, res, next) => {
  try {
    const payload = z.object({
      alertType: z.string().min(1),
      reason: z.string().min(5),
      interactionId: z.string().optional(),
      contraindicationId: z.string().optional(),
      details: z.record(z.unknown()).optional(),
    }).parse(req.body);

    const data = await createOverrideLog({
      pharmacyId: req.user!.pharmacyId!,
      userId: req.user!.userId,
      picUserId: req.picVerifiedUser!.userId,
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
