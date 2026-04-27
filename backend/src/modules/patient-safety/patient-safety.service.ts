import type {
  ActiveIngredient,
  DrugContraindication,
  DrugDatabase,
  DrugInteraction,
  DrugProduct,
  HepaticFlag,
  LactationFlag,
  PregnancyFlag,
  Prisma,
  RenalFlag,
  Warning,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { DIAGNOSIS_DRUG_MAP } from '../../data/drug-database-seed';

type ResolvedDrug = Pick<
  DrugDatabase,
  | 'id'
  | 'genericName'
  | 'brandNames'
  | 'drugClass'
  | 'therapeuticCategory'
  | 'awarClass'
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

type SourceDocumentMeta = {
  title: string;
  url: string | null;
  sourceName: string;
};

type InteractionCatalogueRow = DrugInteraction & {
  drugA: DrugDatabase;
  drugB: DrugDatabase;
  sourceDocument: SourceDocumentMeta | null;
};

type ContraindicationCatalogueRow = DrugContraindication & {
  drug: DrugDatabase;
  sourceDocument: SourceDocumentMeta | null;
};

type WarningCatalogueRow = Warning & {
  drugProduct: Pick<DrugProduct, 'id' | 'productName' | 'genericName'> | null;
  activeIngredient: Pick<ActiveIngredient, 'id' | 'name'> | null;
  drugDatabase: DrugDatabase | null;
  sourceDocument: SourceDocumentMeta | null;
};

type PregnancyFlagCatalogueRow = PregnancyFlag & {
  drugProduct: Pick<DrugProduct, 'id' | 'productName' | 'genericName'> | null;
  activeIngredient: Pick<ActiveIngredient, 'id' | 'name'> | null;
  drugDatabase: DrugDatabase | null;
  sourceDocument: SourceDocumentMeta | null;
};

type LactationFlagCatalogueRow = LactationFlag & {
  drugProduct: Pick<DrugProduct, 'id' | 'productName' | 'genericName'> | null;
  activeIngredient: Pick<ActiveIngredient, 'id' | 'name'> | null;
  drugDatabase: DrugDatabase | null;
  sourceDocument: SourceDocumentMeta | null;
};

type RenalFlagCatalogueRow = RenalFlag & {
  drugProduct: Pick<DrugProduct, 'id' | 'productName' | 'genericName'> | null;
  activeIngredient: Pick<ActiveIngredient, 'id' | 'name'> | null;
  drugDatabase: DrugDatabase | null;
  sourceDocument: SourceDocumentMeta | null;
};

type HepaticFlagCatalogueRow = HepaticFlag & {
  drugProduct: Pick<DrugProduct, 'id' | 'productName' | 'genericName'> | null;
  activeIngredient: Pick<ActiveIngredient, 'id' | 'name'> | null;
  drugDatabase: DrugDatabase | null;
  sourceDocument: SourceDocumentMeta | null;
};

type PrecautionCatalogueRow =
  | WarningCatalogueRow
  | PregnancyFlagCatalogueRow
  | LactationFlagCatalogueRow
  | RenalFlagCatalogueRow
  | HepaticFlagCatalogueRow;

type SafetyTargets = {
  drugDatabaseIds: Set<string>;
  drugProductIds: Set<string>;
  activeIngredientIds: Set<string>;
};

export type SafetyAlertPayload = {
  id: string;
  drug?: string;
  drugA?: string;
  drugB?: string;
  severity: string;
  message?: string;
  effectSummary?: string;
  management?: string | null;
  requiresPicPin: boolean;
  conditionType?: string;
  conditionValue?: string;
  ruleType?: string;
  sourceTitle?: string | null;
  sourceSection?: string | null;
  sourceUrl?: string | null;
};

const APPROVED_REVIEW_STATUS = 'APPROVED';
const CACHE_TTL_MS = 5 * 60 * 1000;

let reviewedDrugCache: { value: DrugDatabase[]; expiresAt: number } | null = null;
let interactionCache: { value: InteractionCatalogueRow[]; expiresAt: number } | null = null;
let contraindicationCache: { value: ContraindicationCatalogueRow[]; expiresAt: number } | null = null;
let warningCache: { value: WarningCatalogueRow[]; expiresAt: number } | null = null;
let pregnancyFlagCache: { value: PregnancyFlagCatalogueRow[]; expiresAt: number } | null = null;
let lactationFlagCache: { value: LactationFlagCatalogueRow[]; expiresAt: number } | null = null;
let renalFlagCache: { value: RenalFlagCatalogueRow[]; expiresAt: number } | null = null;
let hepaticFlagCache: { value: HepaticFlagCatalogueRow[]; expiresAt: number } | null = null;

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

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function mapSourceFields(
  sourceDocument: SourceDocumentMeta | null,
  sourceSection?: string | null,
  sourceUrl?: string | null,
) {
  return {
    sourceTitle: sourceDocument?.title ?? null,
    sourceSection: sourceSection ?? null,
    sourceUrl: sourceUrl ?? sourceDocument?.url ?? null,
  };
}

function normalizeFlagSeverity(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  switch (normalized) {
    case 'contraindicated':
      return 'CONTRAINDICATED';
    case 'major':
    case 'high':
    case 'avoid':
      return 'MAJOR';
    case 'moderate':
      return 'MODERATE';
    case 'minor':
      return 'MINOR';
    case 'info':
    case 'informational':
      return 'INFO';
    default:
      return 'INFO';
  }
}

function getPrecautionSubjectName(row: PrecautionCatalogueRow): string | null {
  return row.drugDatabase?.genericName ?? row.drugProduct?.genericName ?? row.drugProduct?.productName ?? row.activeIngredient?.name ?? null;
}

function summariseSeverity(alerts: SafetyAlertPayload[]) {
  return alerts.reduce(
    (acc, alert) => {
      const normalized = normalizeFlagSeverity(alert.severity);
      if (normalized === 'CONTRAINDICATED' || normalized === 'MAJOR') {
        acc.high += 1;
      } else if (normalized === 'MODERATE') {
        acc.moderate += 1;
      } else {
        acc.informational += 1;
      }
      return acc;
    },
    { high: 0, moderate: 0, informational: 0 },
  );
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
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugA: true,
      drugB: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
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
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drug: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  contraindicationCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getWarningCatalogue() {
  if (warningCache && warningCache.expiresAt > Date.now()) {
    return warningCache.value;
  }

  const value = await prisma.warning.findMany({
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugProduct: {
        select: {
          id: true,
          productName: true,
          genericName: true,
        },
      },
      activeIngredient: {
        select: {
          id: true,
          name: true,
        },
      },
      drugDatabase: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  warningCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getPregnancyFlagCatalogue() {
  if (pregnancyFlagCache && pregnancyFlagCache.expiresAt > Date.now()) {
    return pregnancyFlagCache.value;
  }

  const value = await prisma.pregnancyFlag.findMany({
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugProduct: {
        select: {
          id: true,
          productName: true,
          genericName: true,
        },
      },
      activeIngredient: {
        select: {
          id: true,
          name: true,
        },
      },
      drugDatabase: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  pregnancyFlagCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getLactationFlagCatalogue() {
  if (lactationFlagCache && lactationFlagCache.expiresAt > Date.now()) {
    return lactationFlagCache.value;
  }

  const value = await prisma.lactationFlag.findMany({
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugProduct: {
        select: {
          id: true,
          productName: true,
          genericName: true,
        },
      },
      activeIngredient: {
        select: {
          id: true,
          name: true,
        },
      },
      drugDatabase: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  lactationFlagCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getRenalFlagCatalogue() {
  if (renalFlagCache && renalFlagCache.expiresAt > Date.now()) {
    return renalFlagCache.value;
  }

  const value = await prisma.renalFlag.findMany({
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugProduct: {
        select: {
          id: true,
          productName: true,
          genericName: true,
        },
      },
      activeIngredient: {
        select: {
          id: true,
          name: true,
        },
      },
      drugDatabase: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  renalFlagCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

async function getHepaticFlagCatalogue() {
  if (hepaticFlagCache && hepaticFlagCache.expiresAt > Date.now()) {
    return hepaticFlagCache.value;
  }

  const value = await prisma.hepaticFlag.findMany({
    where: { reviewStatus: APPROVED_REVIEW_STATUS },
    include: {
      drugProduct: {
        select: {
          id: true,
          productName: true,
          genericName: true,
        },
      },
      activeIngredient: {
        select: {
          id: true,
          name: true,
        },
      },
      drugDatabase: true,
      sourceDocument: {
        select: {
          title: true,
          url: true,
          sourceName: true,
        },
      },
    },
  });
  hepaticFlagCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
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

  return catalogue.find((drug) => normalizeText(drug.genericName).includes(normalized)) ?? null;
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

async function resolveSafetyTargets(
  context: SafetySessionContext,
  resolvedDrugs: ResolvedDrug[],
): Promise<SafetyTargets> {
  const drugDatabaseIds = new Set(resolvedDrugs.map((drug) => drug.id));
  const drugProductIds = new Set<string>();
  const activeIngredientIds = new Set<string>();

  if (context.productIds?.length) {
    const products = await prisma.product.findMany({
      where: { id: { in: context.productIds } },
      select: {
        drugMasterId: true,
        drugMaster: {
          select: {
            productIngredients: {
              select: {
                activeIngredientId: true,
              },
            },
          },
        },
      },
    });

    for (const product of products) {
      if (product.drugMasterId) {
        drugProductIds.add(product.drugMasterId);
      }

      for (const ingredient of product.drugMaster?.productIngredients ?? []) {
        activeIngredientIds.add(ingredient.activeIngredientId);
      }
    }
  }

  const normalizedDrugNames = uniqueStrings(resolvedDrugs.map((drug) => drug.genericName));
  if (normalizedDrugNames.length > 0) {
    const ingredientMatches = await prisma.activeIngredient.findMany({
      where: {
        normalizedName: { in: normalizedDrugNames },
      },
      select: { id: true },
    });

    for (const ingredient of ingredientMatches) {
      activeIngredientIds.add(ingredient.id);
    }
  }

  return {
    drugDatabaseIds,
    drugProductIds,
    activeIngredientIds,
  };
}

export function deriveRequiredPatientInputs(input: {
  contraindications: Array<
    Pick<DrugContraindication, 'conditionType'> & {
      drug: Pick<DrugDatabase, 'genericName'>;
    }
  >;
  pregnancyFlags: PrecautionCatalogueRow[];
  lactationFlags: PrecautionCatalogueRow[];
  renalFlags: PrecautionCatalogueRow[];
  hepaticFlags: PrecautionCatalogueRow[];
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

  for (const row of input.pregnancyFlags) {
    const subject = getPrecautionSubjectName(row);
    if (subject) {
      addInput('pregnant', `${subject} has approved pregnancy guidance.`);
    }
  }

  for (const row of input.lactationFlags) {
    const subject = getPrecautionSubjectName(row);
    if (subject) {
      addInput('breastfeeding', `${subject} has approved lactation guidance.`);
    }
  }

  for (const row of input.renalFlags) {
    const subject = getPrecautionSubjectName(row);
    if (subject) {
      addInput('renalImpairment', `${subject} has approved renal caution guidance.`);
    }
  }

  for (const row of input.hepaticFlags) {
    const subject = getPrecautionSubjectName(row);
    if (subject) {
      addInput('hepaticImpairment', `${subject} has approved hepatic caution guidance.`);
    }
  }

  return [...required.values()];
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

function buildPrecautionAlert(
  row: PrecautionCatalogueRow,
  message: string,
  severity: string,
  ruleType: string,
): SafetyAlertPayload | null {
  const drug = getPrecautionSubjectName(row);
  if (!drug) {
    return null;
  }

  return {
    id: row.id,
    drug,
    severity,
    message,
    requiresPicPin: false,
    ruleType,
    ...mapSourceFields(row.sourceDocument, row.sourceSection),
  };
}

async function getPrecautionAlerts(
  context: SafetySessionContext,
  resolvedDrugs: ResolvedDrug[],
  safetyTargets: SafetyTargets,
): Promise<SafetyAlertPayload[]> {
  if (resolvedDrugs.length === 0) {
    return [];
  }

  const [warnings, pregnancyFlags, lactationFlags, renalFlags, hepaticFlags] = await Promise.all([
    getWarningCatalogue(),
    getPregnancyFlagCatalogue(),
    getLactationFlagCatalogue(),
    getRenalFlagCatalogue(),
    getHepaticFlagCatalogue(),
  ]);

  const alerts: SafetyAlertPayload[] = [];

  for (const row of warnings) {
    const matchesTarget =
      (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
      (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
      (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId));
    if (!matchesTarget) {
      continue;
    }

    const alert = buildPrecautionAlert(
      row,
      row.message,
      normalizeFlagSeverity(row.severity),
      row.warningType,
    );
    if (alert) {
      alerts.push(alert);
    }
  }

  if (context.pregnant) {
    for (const row of pregnancyFlags) {
      const matchesTarget =
        (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
        (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
        (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId));
      if (!matchesTarget) {
        continue;
      }

      const alert = buildPrecautionAlert(
        row,
        row.message,
        normalizeFlagSeverity(row.riskLevel),
        'PREGNANCY',
      );
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  if (context.breastfeeding) {
    for (const row of lactationFlags) {
      const matchesTarget =
        (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
        (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
        (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId));
      if (!matchesTarget) {
        continue;
      }

      const alert = buildPrecautionAlert(
        row,
        row.message,
        normalizeFlagSeverity(row.riskLevel),
        'LACTATION',
      );
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  if (context.renalImpairment) {
    for (const row of renalFlags) {
      const matchesTarget =
        (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
        (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
        (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId));
      if (!matchesTarget) {
        continue;
      }

      const alert = buildPrecautionAlert(
        row,
        row.message,
        normalizeFlagSeverity(row.severity),
        'RENAL',
      );
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  if (context.hepaticImpairment) {
    for (const row of hepaticFlags) {
      const matchesTarget =
        (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
        (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
        (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId));
      if (!matchesTarget) {
        continue;
      }

      const alert = buildPrecautionAlert(
        row,
        row.message,
        normalizeFlagSeverity(row.severity),
        'HEPATIC',
      );
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  return alerts;
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
    awarClass: drug.awarClass,
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

  const unique = new Map<string, InteractionCatalogueRow>();
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
    ruleType: 'INTERACTION',
    ...mapSourceFields(row.sourceDocument, row.sourceSection, row.sourceUrl),
  }));

  return { interactions, resolvedDrugs: drugs };
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
      ruleType: 'CONTRAINDICATION',
      ...mapSourceFields(row.sourceDocument, row.sourceSection, row.sourceUrl),
    }));

  return { contraindications, resolvedDrugs: drugs };
}

export function calculateDose(input: {
  adultDoseMg: number;
  ageYears?: number;
  weightKg?: number;
  recommendedMgPerKg?: number | string;
}) {
  const outputs: Array<{
    method: string;
    valueMg: number | null;
    displayValue?: string;
    working: string;
    supported: boolean;
  }> = [];
  const adultDose = input.adultDoseMg;
  const recommendation = parseMgPerKgRecommendation(input.recommendedMgPerKg);

  outputs.push({
    method: 'Adult reference',
    valueMg: Math.round(adultDose * 100) / 100,
    displayValue: `${Math.round(adultDose * 100) / 100} mg`,
    working: `Adult reference dose = ${Math.round(adultDose * 100) / 100} mg`,
    supported: true,
  });

  if (input.weightKg && input.weightKg > 0) {
    const value = (input.weightKg / 70) * adultDose;
    outputs.push({
      method: "Clark's rule",
      valueMg: Math.round(value * 100) / 100,
      displayValue: `${Math.round(value * 100) / 100} mg`,
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
      displayValue: `${Math.round(value * 100) / 100} mg`,
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

  if (input.weightKg && recommendation) {
    const minValue = Math.round(input.weightKg * recommendation.minMgPerKg * 100) / 100;
    const maxValue = Math.round(input.weightKg * recommendation.maxMgPerKg * 100) / 100;
    const valueSuffix = recommendation.qualifier ? `/${recommendation.qualifier}` : '';
    const displayValue =
      minValue === maxValue
        ? `${minValue} mg${valueSuffix}`
        : `${minValue}-${maxValue} mg${valueSuffix}`;

    outputs.push({
      method: 'Weight-based',
      valueMg: minValue === maxValue ? minValue : null,
      displayValue,
      working:
        minValue === maxValue
          ? `${input.weightKg} kg x ${recommendation.minMgPerKg} mg/kg${valueSuffix} = ${minValue} mg${valueSuffix}`
          : `${input.weightKg} kg x ${recommendation.minMgPerKg}-${recommendation.maxMgPerKg} mg/kg${valueSuffix} = ${minValue}-${maxValue} mg${valueSuffix}`,
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

export function parseMgPerKgRecommendation(input?: number | string | null) {
  if (typeof input === 'number' && input > 0) {
    return {
      minMgPerKg: input,
      maxMgPerKg: input,
      qualifier: null as 'day' | 'dose' | null,
    };
  }

  const normalized = normalizeText(typeof input === 'string' ? input.replace(/[–—]/g, '-') : '');
  if (!normalized) {
    return null;
  }

  const rangeMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*mg\s*\/\s*kg(?:\s*\/\s*(day|dose))?/i,
  );
  if (rangeMatch) {
    return {
      minMgPerKg: Number(rangeMatch[1]),
      maxMgPerKg: Number(rangeMatch[2]),
      qualifier: (rangeMatch[3] as 'day' | 'dose' | undefined) ?? null,
    };
  }

  const singleMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*mg\s*\/\s*kg(?:\s*\/\s*(day|dose))?/i,
  );
  if (singleMatch) {
    return {
      minMgPerKg: Number(singleMatch[1]),
      maxMgPerKg: Number(singleMatch[1]),
      qualifier: (singleMatch[2] as 'day' | 'dose' | undefined) ?? null,
    };
  }

  return null;
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
  const safetyTargets = await resolveSafetyTargets(context, resolvedDrugs);
  const [
    contraindicationCatalogue,
    pregnancyFlagCatalogue,
    lactationFlagCatalogue,
    renalFlagCatalogue,
    hepaticFlagCatalogue,
    precautionAlerts,
  ] = await Promise.all([
    getContraindicationCatalogue(),
    getPregnancyFlagCatalogue(),
    getLactationFlagCatalogue(),
    getRenalFlagCatalogue(),
    getHepaticFlagCatalogue(),
    getPrecautionAlerts(context, resolvedDrugs, safetyTargets),
  ]);

  const requiredPatientInputs = deriveRequiredPatientInputs({
    contraindications: contraindicationCatalogue.filter((row) =>
      resolvedDrugs.some((drug) => drug.id === row.drugId),
    ),
    pregnancyFlags: pregnancyFlagCatalogue.filter((row) =>
      (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
      (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
      (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId)),
    ),
    lactationFlags: lactationFlagCatalogue.filter((row) =>
      (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
      (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
      (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId)),
    ),
    renalFlags: renalFlagCatalogue.filter((row) =>
      (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
      (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
      (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId)),
    ),
    hepaticFlags: hepaticFlagCatalogue.filter((row) =>
      (row.drugDatabaseId && safetyTargets.drugDatabaseIds.has(row.drugDatabaseId)) ||
      (row.drugProductId && safetyTargets.drugProductIds.has(row.drugProductId)) ||
      (row.activeIngredientId && safetyTargets.activeIngredientIds.has(row.activeIngredientId)),
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

  const allAlerts = [
    ...interactionResult.interactions,
    ...contraindicationResult.contraindications,
    ...precautionAlerts,
  ];

  return {
    resolvedDrugs: resolvedDrugs.map((drug) => ({
      id: drug.id,
      genericName: drug.genericName,
      therapeuticCategory: drug.therapeuticCategory,
      awarClass: drug.awarClass,
      source: drug.source,
      sourceType: drug.sourceType,
    })),
    interactions: interactionResult.interactions,
    contraindications: contraindicationResult.contraindications,
    precautions: precautionAlerts,
    severitySummary: summariseSeverity(allAlerts),
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
    awarClass: drug.awarClass,
  }));
}
