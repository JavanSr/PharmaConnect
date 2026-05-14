import { describe, expect, it, afterAll } from 'vitest';
import {
  getSafetyImpactReport,
  recordAnonymousSafetyEvents,
  sessionReview,
} from '../src/modules/patient-safety/patient-safety.service';
import { prisma } from '../src/lib/prisma';
import { createPharmacy, createUser, disconnectTestDb } from './helpers';

describe('anonymous safety event reporting', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('stores anonymous safety signals and aggregates them for pharmacy reports', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });

    await recordAnonymousSafetyEvents({
      pharmacyId: pharmacy.id,
      userId: owner.user.id,
      dispensingEventId: 'dispensing-test-1',
      referenceNumber: 'RX-SAFE-1',
      context: {
        productIds: ['product-a', 'product-b'],
        ageYears: 68,
        allergies: ['penicillin'],
        diagnoses: ['hypertension'],
        renalImpairment: true,
      },
      review: {
        resolvedDrugs: [
          {
            id: 'drug-warfarin',
            genericName: 'warfarin',
            therapeuticCategory: 'Anticoagulant',
            awarClass: null,
            source: 'product-a',
            sourceType: 'product',
          },
          {
            id: 'drug-diclofenac',
            genericName: 'diclofenac',
            therapeuticCategory: 'NSAID',
            awarClass: null,
            source: 'product-b',
            sourceType: 'product',
          },
        ],
        interactions: [
          {
            id: 'interaction-1',
            drugA: 'warfarin',
            drugB: 'diclofenac',
            severity: 'MAJOR',
            effectSummary: 'Bleeding risk',
            management: 'Avoid combination where possible',
            requiresPicPin: true,
            ruleType: 'INTERACTION',
            sourceTitle: 'Test source',
            sourceSection: null,
            sourceUrl: null,
          },
        ],
        contraindications: [
          {
            id: 'contra-1',
            drug: 'amoxicillin',
            severity: 'CONTRAINDICATED',
            message: 'Avoid in matching allergy',
            conditionType: 'ALLERGY_CLASS',
            conditionValue: 'penicillin',
            requiresPicPin: true,
            ruleType: 'CONTRAINDICATION',
            sourceTitle: 'Test source',
            sourceSection: null,
            sourceUrl: null,
          },
        ],
        precautions: [],
        severitySummary: { high: 2, moderate: 0, informational: 0 },
        diagnosisMatches: [],
        ncdHints: ['Check blood pressure control before counselling.'],
        dosageSuggestions: [],
        requiredPatientInputs: [],
        requiresPicPin: true,
      },
      overrideEntered: true,
    });

    const report = await getSafetyImpactReport({ pharmacyId: pharmacy.id });

    expect(report.scope).toBe('pharmacy');
    expect(report.totalEvents).toBe(4);
    expect(report.highRiskCount).toBe(3);
    expect(report.byType.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        'INTERACTION_WARNING',
        'ALLERGY_WARNING',
        'NCD_COUNSELLING_HINT',
        'PIC_OVERRIDE_DOCUMENTED',
      ]),
    );
    expect(report.contextFlags).toMatchObject({
      allergy: 4,
      diagnosis: 4,
      renal: 4,
    });
    expect(report.topDrugs.map((item) => item.name)).toEqual(
      expect.arrayContaining(['warfarin', 'diclofenac', 'amoxicillin']),
    );
  });

  it('keeps warm-cache five-drug safety review under 500ms', async () => {
    const suffix = Date.now().toString(36);
    const drugNames = Array.from({ length: 5 }, (_, index) => `codex safety ${suffix} ${index + 1}`);
    const drugs = await Promise.all(
      drugNames.map((genericName) =>
        prisma.drugDatabase.create({
          data: {
            genericName,
            brandNames: [],
            therapeuticCategory: 'Test safety class',
            standardAdultDose: '1 tablet daily',
            clinicianReviewed: true,
          },
        }),
      ),
    );

    await prisma.drugInteraction.create({
      data: {
        drugAId: drugs[0].id,
        drugBId: drugs[1].id,
        severity: 'MAJOR',
        effectSummary: 'Test interaction timing signal',
        management: 'Review before dispensing',
        requiresPicPin: true,
        reviewStatus: 'APPROVED',
      },
    });

    const context = { medicines: drugNames };
    await sessionReview(context);

    const startedAt = performance.now();
    const review = await sessionReview(context);
    const elapsedMs = performance.now() - startedAt;

    expect(review.resolvedDrugs).toHaveLength(5);
    expect(review.interactions.some((item) => item.requiresPicPin)).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });
});
