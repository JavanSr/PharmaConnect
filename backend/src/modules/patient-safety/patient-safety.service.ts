import type { DrugContraindication, DrugDatabase, DrugInteraction, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { DIAGNOSIS_DRUG_MAP } from '../../data/drug-database-seed';

type ResolvedDrug = Pick<
  DrugDatabase,
  | 'id'
  | 'genericName'
  | 'brandNames'
  | 'drugClass'
  | 'therapeuticCategory'
  | 'standardAdultDose'
  | 'frequency'
  | 'route'
  | 'paediatricDoseFormula'
  | 'elderlyDoseNotes'
  | 'pregnancyCategory'
  | 'breastfeedingSafety'
  | 'elderlyCaution'
  | 'renalCaution'
  | 'hepaticCaution'
  | 'ncdHints'
  | 'clinicianReviewed'
> & {
  source: string;
  sourceType: 'product' | 'manual' | 'session';
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let reviewedDrugCache: { value: DrugDatabase[]; expiresAt: number } | null = null;
let interactionCache:
  | {
      value: Array<DrugInteraction & { drugA: DrugDatabase; drugB: DrugDatabase }>;
      expiresAt: number;
    }
  | null = null;
let contraindicationCache:
  | {
      value: Array<DrugContraindication & { drug: DrugDatabase }>;
      expiresAt: number;
    }
  | null = null;

export type SafetySessionContext = {
  productIds?: string[];
  medicines?: string[];
  pregnant?: boolean;
  breastfeeding?: boolean;
  ageYears?: number;
  weightKg?: number;
  allergies?: string[];
  diagnoses?: string[];
  renalImpairment?: boolean;
  hepaticImpairment?: boolean;
};

export type RequiredPatientInputKey =
  | 'pregnant'
  | 'breastfeeding'
  | 'diagnoses'
  | 'allergies'
  | 'renalImpairment'
  | 'hepaticImpairment';

export type RequiredPatientInput = {
  key: RequiredPatientInputKey;
  label: string;
  reason: string;
};

const REQUIRED_PATIENT_INPUT_META: Record<RequiredPatientInputKey, { label: string }> = {
  pregnant: { label: 'Pregnancy status' },
  breastfeeding: { label: 'Breastfeeding status' },
  diagnoses: { label: 'Relevant diagnoses' },
  allergies: { label: 'Allergy history' },
  renalImpairment: { label: 'Renal impairment' },
  hepaticImpairment: { label: 'Hepatic impairment' },
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

async function resolveReviewedDrugByTerm(term: string): Promise<DrugDatabase | null> {
  const normalized = normalizeText(term);
  if (!normalized) {
    return null;
  }

  const exact = await prisma.drugDatabase.findFirst({
    where: {
      clinicianReviewed: true,
      OR: [
        { genericName: { equals: normalized, mode: 'insensitive' } },
        { brandNames: { has: normalized } },
      ],
    },
  });

  if (exact) {
    return exact;
  }

  return prisma.drugDatabase.findFirst({
    where: {
      clinicianReviewed: true,
      genericName: { contains: normalized, mode: 'insensitive' },
    },
  });
}

async function getReviewedDrugCatalogue(): Promise<DrugDatabase[]> {
  if (reviewedDrugCache && reviewedDrugCache.expiresAt > Date.now()) {
    return reviewedDrugCache.value;
  }

  const value = await prisma.drugDatabase.findMany({
    where: { clinicianReviewed: true },
    orderBy: { genericName: 'asc' },
  });
  reviewedDrugCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getInteractionCatalogue() {
  if (interactionCache && interactionCache.expiresAt > Date.now()) {
    return interactionCache.value;
  }

  const value = await prisma.drugInteraction.findMany({
    include: {
      drugA: true,
      drugB: true,
    },
  });
  interactionCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getContraindicationCatalogue() {
  if (contraindicationCache && contraindicationCache.expiresAt > Date.now()) {
    return contraindicationCache.value;
  }

  const value = await prisma.drugContraindication.findMany({
    include: { drug: true },
  });
  contraindicationCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

function matchDrugFromCatalogue(catalogue: DrugDatabase[], term: string): DrugDatabase | null {
  const normalized = normalizeText(term);
  if (!normalized) {
    return null;
  }

  const exact = catalogue.find((drug) =>
    normalizeText(drug.genericName) === normalized ||
    drug.brandNames.some((brand) => normalizeText(brand) === normalized),
  );
  if (exact) {
    return exact;
  }

  return (
    catalogue.find((drug) => normalizeText(drug.genericName).includes(normalized)) ??
    null
  );
}

async function resolveDrugsFromContext(context: SafetySessionContext): Promise<ResolvedDrug[]> {
  const resolved: ResolvedDrug[] = [];
  const seen = new Set<string>();
  const productIds = context.productIds ?? [];
  const catalogue = await getReviewedDrugCatalogue();

  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, genericName: true },
    });

    for (const product of products) {
      const term = product.genericName || product.name;
      const drug = matchDrugFromCatalogue(catalogue, term);
      if (drug && !seen.has(drug.id)) {
        resolved.push({ ...drug, source: product.id, sourceType: 'product' });
        seen.add(drug.id);
      }
    }
  }

  for (const medicine of context.medicines ?? []) {
    const drug = matchDrugFromCatalogue(catalogue, medicine);
    if (drug && !seen.has(drug.id)) {
      resolved.push({ ...drug, source: medicine, sourceType: 'manual' });
      seen.add(drug.id);
    }
  }

  return resolved;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export function deriveRequiredPatientInputs(input: {
  resolvedDrugs: Array<
    Pick<
      ResolvedDrug,
      | 'genericName'
      | 'pregnancyCategory'
      | 'breastfeedingSafety'
      | 'renalCaution'
      | 'hepaticCaution'
    >
  >;
  contraindications: Array<
    Pick<DrugContraindication, 'conditionType'> & {
      drug: Pick<DrugDatabase, 'genericName'>;
    }
  >;
}): RequiredPatientInput[] {
  const required = new Map<RequiredPatientInputKey, RequiredPatientInput>();
  const addInput = (key: RequiredPatientInputKey, reason: string) => {
    if (!required.has(key)) {
      required.set(key, {
        key,
        label: REQUIRED_PATIENT_INPUT_META[key].label,
        reason,
      });
    }
  };

  for (const row of input.contraindications) {
    switch (row.conditionType) {
      case 'PREGNANCY':
        addInput('pregnant', `${row.drug.genericName} needs pregnancy screening.`);
        break;
      case 'ALLERGY_CLASS':
        addInput('allergies', `${row.drug.genericName} needs allergy history.`);
        break;
      case 'DIAGNOSIS':
        addInput('diagnoses', `${row.drug.genericName} needs diagnosis review.`);
        break;
      case 'RENAL':
        addInput('renalImpairment', `${row.drug.genericName} needs renal status.`);
        break;
      case 'HEPATIC':
        addInput('hepaticImpairment', `${row.drug.genericName} needs hepatic status.`);
        break;
      default:
        break;
    }
  }

  for (const drug of input.resolvedDrugs) {
    if (['D', 'X'].includes(drug.pregnancyCategory)) {
      addInput('pregnant', `${drug.genericName} has pregnancy risk guidance.`);
    }

    if (drug.breastfeedingSafety && normalizeText(drug.breastfeedingSafety) !== 'compatible') {
      addInput('breastfeeding', `${drug.genericName} has breastfeeding caution.`);
    }

    if (drug.renalCaution) {
      addInput('renalImpairment', `${drug.genericName} has renal caution.`);
    }

    if (drug.hepaticCaution) {
      addInput('hepaticImpairment', `${drug.genericName} has hepatic caution.`);
    }
  }

  return [...required.values()];
}

export async function getDrugDetails(query: string) {
  const drug = await resolveReviewedDrugByTerm(query);
  if (!drug) {
    return null;
  }

  return {
    id: drug.id,
    genericName: drug.genericName,
    brandNames: drug.brandNames,
    therapeuticCategory: drug.therapeuticCategory,
    standardAdultDose: drug.standardAdultDose,
    frequency: drug.frequency,
    route: drug.route,
    dosageSuggestions: {
      adult: drug.standardAdultDose,
      paediatric: drug.paediatricDoseFormula,
      elderly: drug.elderlyDoseNotes,
    },
    ncdHints: drug.ncdHints,
    pregnancyCategory: drug.pregnancyCategory,
    breastfeedingSafety: drug.breastfeedingSafety,
  };
}

export async function checkInteractions(context: SafetySessionContext) {
  const drugs = await resolveDrugsFromContext(context);
  if (drugs.length < 2) {
    return { interactions: [], resolvedDrugs: drugs };
  }

  const ids = drugs.map((drug) => drug.id);
  const interactionCatalogue = await getInteractionCatalogue();
  const rows = interactionCatalogue.filter(
    (row) => ids.includes(row.drugAId) && ids.includes(row.drugBId) && row.drugAId !== row.drugBId,
  );

  const unique = new Map<string, DrugInteraction & { drugA: DrugDatabase; drugB: DrugDatabase }>();
  for (const row of rows) {
    const key = pairKey(row.drugAId, row.drugBId);
    if (!unique.has(key)) {
      unique.set(key, row);
    }
  }

  const interactions = [...unique.values()].map((row) => ({
    id: row.id,
    drugA: row.drugA.genericName,
    drugB: row.drugB.genericName,
    severity: row.severity,
    effectSummary: row.effectSummary,
    management: row.management,
    requiresPicPin: row.requiresPicPin,
  }));

  return { interactions, resolvedDrugs: drugs };
}

function contraindicationMatches(
  contraindication: DrugContraindication,
  context: SafetySessionContext,
): boolean {
  const allergies = uniqueStrings(context.allergies ?? []);
  const diagnoses = uniqueStrings(context.diagnoses ?? []);

  switch (contraindication.conditionType) {
    case 'PREGNANCY':
      return Boolean(context.pregnant);
    case 'ALLERGY_CLASS':
      return allergies.includes(normalizeText(contraindication.conditionValue));
    case 'DIAGNOSIS':
      return diagnoses.some((diagnosis) => diagnosis.includes(normalizeText(contraindication.conditionValue)));
    case 'RENAL':
      return Boolean(context.renalImpairment);
    case 'HEPATIC':
      return Boolean(context.hepaticImpairment);
    case 'ELDERLY':
      return (context.ageYears ?? 0) >= 65;
    default:
      return false;
  }
}

export async function checkContraindications(context: SafetySessionContext) {
  const drugs = await resolveDrugsFromContext(context);
  if (drugs.length === 0) {
    return { contraindications: [], resolvedDrugs: drugs };
  }

  const contraindicationCatalogue = await getContraindicationCatalogue();
  const rows = contraindicationCatalogue.filter((row) => drugs.some((drug) => drug.id === row.drugId));

  const contraindications = rows
    .filter((row) => contraindicationMatches(row, context))
    .map((row) => ({
      id: row.id,
      drug: row.drug.genericName,
      severity: row.severity,
      message: row.message,
      conditionType: row.conditionType,
      conditionValue: row.conditionValue,
      requiresPicPin: row.requiresPicPin,
    }));

  for (const drug of drugs) {
    if (context.pregnant && ['D', 'X'].includes(drug.pregnancyCategory)) {
      contraindications.push({
        id: `pregnancy-${drug.id}`,
        drug: drug.genericName,
        severity: drug.pregnancyCategory === 'X' ? 'CONTRAINDICATED' : 'MAJOR',
        message: `Pregnancy category ${drug.pregnancyCategory} requires caution for ${drug.genericName}.`,
        conditionType: 'PREGNANCY',
        conditionValue: drug.pregnancyCategory,
        requiresPicPin: ['D', 'X'].includes(drug.pregnancyCategory),
      });
    }
  }

  return { contraindications, resolvedDrugs: drugs };
}

export function calculateDose(input: {
  adultDoseMg: number;
  ageYears?: number;
  weightKg?: number;
  recommendedMgPerKg?: number;
}) {
  const outputs: Array<{ method: string; valueMg: number | null; working: string; supported: boolean }> = [];
  const adultDose = input.adultDoseMg;

  if (input.weightKg && input.weightKg > 0) {
    const value = (input.weightKg / 70) * adultDose;
    outputs.push({
      method: "Clark's rule",
      valueMg: Math.round(value * 100) / 100,
      working: `(${input.weightKg} kg / 70 kg) x ${adultDose} mg = ${Math.round(value * 100) / 100} mg`,
      supported: true,
    });
  } else {
    outputs.push({
      method: "Clark's rule",
      valueMg: null,
      working: 'Weight in kilograms is required.',
      supported: false,
    });
  }

  if (typeof input.ageYears === 'number' && input.ageYears > 0) {
    const value = (input.ageYears / (input.ageYears + 12)) * adultDose;
    outputs.push({
      method: "Young's rule",
      valueMg: Math.round(value * 100) / 100,
      working: `(${input.ageYears} / (${input.ageYears} + 12)) x ${adultDose} mg = ${Math.round(value * 100) / 100} mg`,
      supported: true,
    });
  } else {
    outputs.push({
      method: "Young's rule",
      valueMg: null,
      working: 'Age in years is required.',
      supported: false,
    });
  }

  if (input.weightKg && input.recommendedMgPerKg) {
    const value = input.weightKg * input.recommendedMgPerKg;
    outputs.push({
      method: 'Weight-based',
      valueMg: Math.round(value * 100) / 100,
      working: `${input.weightKg} kg x ${input.recommendedMgPerKg} mg/kg = ${Math.round(value * 100) / 100} mg`,
      supported: true,
    });
  } else {
    outputs.push({
      method: 'Weight-based',
      valueMg: null,
      working: 'Weight and mg/kg recommendation are required.',
      supported: false,
    });
  }

  return outputs;
}

export async function matchDiagnosis(input: { diagnosis: string; limit?: number }) {
  const normalized = normalizeText(input.diagnosis);
  const matches = Object.entries(DIAGNOSIS_DRUG_MAP)
    .filter(([keyword]) => normalized.includes(keyword))
    .flatMap(([, generics]) => generics);

  const uniqueMatches = [...new Set(matches)];
  if (uniqueMatches.length === 0) {
    return [];
  }

  const drugs = await prisma.drugDatabase.findMany({
    where: {
      clinicianReviewed: true,
      genericName: { in: uniqueMatches },
    },
    take: input.limit ?? 10,
    orderBy: { genericName: 'asc' },
  });

  return drugs.map((drug) => ({
    id: drug.id,
    genericName: drug.genericName,
    therapeuticCategory: drug.therapeuticCategory,
    standardAdultDose: drug.standardAdultDose,
  }));
}

export async function createOverrideLog(input: {
  pharmacyId: string;
  userId: string;
  picUserId: string;
  alertType: string;
  reason: string;
  interactionId?: string;
  contraindicationId?: string;
  payload: Prisma.JsonObject;
}) {
  return prisma.overrideLog.create({
    data: input,
  });
}

export async function sessionReview(context: SafetySessionContext) {
  const [interactionResult, contraindicationResult] = await Promise.all([
    checkInteractions(context),
    checkContraindications(context),
  ]);

  const resolvedDrugMap = new Map<string, ResolvedDrug>();
  for (const drug of [...interactionResult.resolvedDrugs, ...contraindicationResult.resolvedDrugs]) {
    resolvedDrugMap.set(drug.id, drug);
  }

  const resolvedDrugs = [...resolvedDrugMap.values()];
  const contraindicationCatalogue = await getContraindicationCatalogue();
  const requiredPatientInputs = deriveRequiredPatientInputs({
    resolvedDrugs,
    contraindications: contraindicationCatalogue.filter((row) =>
      resolvedDrugs.some((drug) => drug.id === row.drugId),
    ),
  });
  const diagnoses = uniqueStrings(context.diagnoses ?? []).join(' ');
  const diagnosisMatches = diagnoses ? await matchDiagnosis({ diagnosis: diagnoses }) : [];
  const ncdHints = resolvedDrugs.flatMap((drug) => drug.ncdHints ?? []);
  const dosageSuggestions = resolvedDrugs.map((drug) => ({
    drugId: drug.id,
    genericName: drug.genericName,
    adultDose: drug.standardAdultDose,
    paediatric: drug.paediatricDoseFormula,
    elderly: drug.elderlyDoseNotes,
    route: drug.route,
    frequency: drug.frequency,
  }));

  return {
    resolvedDrugs: resolvedDrugs.map((drug) => ({
      id: drug.id,
      genericName: drug.genericName,
      therapeuticCategory: drug.therapeuticCategory,
      source: drug.source,
      sourceType: drug.sourceType,
    })),
    interactions: interactionResult.interactions,
    contraindications: contraindicationResult.contraindications,
    diagnosisMatches,
    ncdHints: [...new Set(ncdHints)],
    dosageSuggestions,
    requiredPatientInputs,
    requiresPicPin:
      interactionResult.interactions.some((item) => item.requiresPicPin) ||
      contraindicationResult.contraindications.some((item) => item.requiresPicPin),
  };
}

export async function searchReviewedDrugs(query: string, limit = 10) {
  const normalized = normalizeText(query);
  if (!normalized) {
    return [];
  }

  const rows = await prisma.drugDatabase.findMany({
    where: {
      clinicianReviewed: true,
      genericName: { contains: normalized, mode: 'insensitive' },
    },
    take: limit,
    orderBy: { genericName: 'asc' },
  });

  return rows.map((drug) => ({
    id: drug.id,
    genericName: drug.genericName,
    brandNames: drug.brandNames,
    therapeuticCategory: drug.therapeuticCategory,
  }));
}
