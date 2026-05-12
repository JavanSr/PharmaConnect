import request from 'supertest';
import app from '../src/index';
import {
  calculateDose,
  deriveRequiredPatientInputs,
  parseMgPerKgRecommendation,
} from '../src/modules/patient-safety/patient-safety.service';
import { DRUG_DATABASE_SEED } from '../src/data/drug-database-seed';
import { createPharmacy, createUser, disconnectTestDb, latestOverrideLogCount, login } from './helpers';

describe('patient safety business logic', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('calculates Clark\'s rule with full working', () => {
    const results = calculateDose({
      adultDoseMg: 500,
      weightKg: 28,
      ageYears: 8,
      recommendedMgPerKg: 7.5,
    });

    const clark = results.find((item) => item.method === "Clark's rule");
    expect(clark?.valueMg).toBe(200);
    expect(clark?.working).toContain('(28 kg / 70 kg) x 500 mg = 200 mg');
  });

  it('parses paracetamol paediatric guidance at 15 mg/kg per dose', () => {
    const paracetamol = DRUG_DATABASE_SEED.find((drug) => drug.genericName === 'paracetamol');
    const parsed = parseMgPerKgRecommendation(paracetamol?.paediatricDoseFormula ?? null);
    const results = calculateDose({
      adultDoseMg: 1000,
      weightKg: 20,
      recommendedMgPerKg: paracetamol?.paediatricDoseFormula,
    });

    expect(parsed).toEqual({
      minMgPerKg: 15,
      maxMgPerKg: 15,
      qualifier: 'dose',
    });
    expect(results.find((item) => item.method === 'Weight-based')?.displayValue).toBe('300 mg/dose');
  });

  it('parses amoxicillin paediatric guidance at 25-50 mg/kg per day', () => {
    const amoxicillin = DRUG_DATABASE_SEED.find((drug) => drug.genericName === 'amoxicillin');
    const parsed = parseMgPerKgRecommendation(amoxicillin?.paediatricDoseFormula ?? null);
    const results = calculateDose({
      adultDoseMg: 500,
      weightKg: 20,
      recommendedMgPerKg: amoxicillin?.paediatricDoseFormula,
    });

    expect(parsed).toEqual({
      minMgPerKg: 25,
      maxMgPerKg: 50,
      qualifier: 'day',
    });
    expect(results.find((item) => item.method === 'Weight-based')?.displayValue).toBe('500-1000 mg/day');
  });

  it('keeps the adult reference dose visible for adult cases', () => {
    const results = calculateDose({
      adultDoseMg: 500,
      ageYears: 32,
    });

    expect(results.find((item) => item.method === 'Adult reference')).toMatchObject({
      valueMg: 500,
      displayValue: '500 mg',
      supported: true,
    });
  });

  it('derives only the patient inputs triggered by the selected basket', () => {
    const required = deriveRequiredPatientInputs({
      resolvedDrugs: [
        {
          genericName: 'warfarin',
          pregnancyCategory: 'X',
          breastfeedingSafety: 'Compatible',
          renalCaution: false,
          hepaticCaution: true,
        } as any,
        {
          genericName: 'amoxicillin',
          pregnancyCategory: 'B',
          breastfeedingSafety: 'Compatible',
          renalCaution: false,
          hepaticCaution: false,
        } as any,
      ],
      contraindications: [
        {
          conditionType: 'ALLERGY_CLASS',
          drug: { genericName: 'amoxicillin' },
        } as any,
      ],
    });

    expect(required.map((item) => item.key)).toEqual([
      'allergies',
      'pregnant',
      'hepaticImpairment',
    ]);
    expect(required[0]?.reason).toContain('amoxicillin');
    expect(required[1]?.reason).toContain('warfarin');
  });

  it.skip('excludes clinician_reviewed=false drugs from search', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const account = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });
    const auth = await login(account.user.email, account.password);

    const response = await request(app)
      .get('/api/v1/patient-safety/drugs/search?q=chlorpheniramine')
      .set('Authorization', `Bearer ${auth.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it.skip('detects known contraindicated interactions and rejects wrong PIC PIN overrides without logging', async () => {
    const pharmacy = await createPharmacy({ subscriptionTier: 'PREMIUM' });
    const owner = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER', picPin: '4321' });
    const dispenser = await createUser({ pharmacyId: pharmacy.id, role: 'DISPENSER' });
    const dispenserAuth = await login(dispenser.user.email, dispenser.password);

    const review = await request(app)
      .post('/api/v1/patient-safety/check-interactions')
      .set('Authorization', `Bearer ${dispenserAuth.body.data.accessToken}`)
      .send({ medicines: ['warfarin', 'diclofenac'] });

    expect(review.status).toBe(200);
    expect(review.body.data.interactions.some((item: any) => item.requiresPicPin)).toBe(true);

    const beforeCount = await latestOverrideLogCount(pharmacy.id);
    const overrideAttempt = await request(app)
      .post('/api/v1/patient-safety/override')
      .set('Authorization', `Bearer ${dispenserAuth.body.data.accessToken}`)
      .send({
        alertType: 'INTERACTION',
        reason: 'Need urgent override',
        interactionId: review.body.data.interactions[0].id,
        pic_pin: '9999',
        pic_user_id: owner.user.id,
      });

    expect(overrideAttempt.status).toBe(403);
    expect(overrideAttempt.body.error).toBe('PIC_PIN_INVALID');
    expect(await latestOverrideLogCount(pharmacy.id)).toBe(beforeCount);
  });
});
