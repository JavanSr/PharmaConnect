import 'dotenv/config';
import {
  ImportMethod,
  PrismaClient,
  ReviewStatus,
  SourceDocumentType,
  SourceTrustLevel,
} from '@prisma/client';
import { DRUG_DATABASE_SEED } from '../src/data/drug-database-seed';
import {
  SAFETY_CONTRAINDICATION_RULES,
  SAFETY_HEPATIC_FLAGS,
  SAFETY_INTERACTION_RULES,
  SAFETY_LACTATION_FLAGS,
  SAFETY_PREGNANCY_FLAGS,
  SAFETY_RENAL_FLAGS,
  SAFETY_SOURCE_DOCUMENTS,
  SAFETY_WARNING_RULES,
} from '../src/data/patient-safety-rules-seed';

function createPrismaClient(url?: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url: url || process.env.DATABASE_URL,
      },
    },
  });
}

let prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);

function parseOptionalDate(value?: string) {
  return value ? new Date(value) : null;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function connectPrisma() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (directError) {
    const canFallback =
      process.env.DIRECT_URL &&
      process.env.DATABASE_URL &&
      process.env.DIRECT_URL !== process.env.DATABASE_URL;

    if (!canFallback) {
      throw directError;
    }

    await prisma.$disconnect().catch(() => undefined);
    prisma = createPrismaClient(process.env.DATABASE_URL);
    await prisma.$queryRawUnsafe('SELECT 1');
  }
}

async function main() {
  await connectPrisma();
  const sourceDocumentIdByKey = new Map<string, string>();

  for (const source of SAFETY_SOURCE_DOCUMENTS) {
    const existing = await prisma.sourceDocument.findFirst({
      where: { url: source.url },
      select: { id: true },
    });

    const sourceDocument = existing
      ? await prisma.sourceDocument.update({
          where: { id: existing.id },
          data: {
            sourceName: source.sourceName,
            title: source.title,
            url: source.url,
            sourceType: source.sourceType as SourceDocumentType,
            trustLevel: source.trustLevel as SourceTrustLevel,
            importMethod: source.importMethod as ImportMethod,
            issuingAuthority: source.issuingAuthority,
            documentVersion: source.documentVersion,
            publicationDate: parseOptionalDate(source.publicationDate),
            effectiveDate: parseOptionalDate(source.effectiveDate),
            lastCheckedAt: new Date(),
            notes: source.notes ?? null,
            isActive: true,
          },
        })
      : await prisma.sourceDocument.create({
          data: {
            sourceName: source.sourceName,
            title: source.title,
            url: source.url,
            sourceType: source.sourceType as SourceDocumentType,
            trustLevel: source.trustLevel as SourceTrustLevel,
            importMethod: source.importMethod as ImportMethod,
            issuingAuthority: source.issuingAuthority,
            documentVersion: source.documentVersion,
            publicationDate: parseOptionalDate(source.publicationDate),
            effectiveDate: parseOptionalDate(source.effectiveDate),
            lastCheckedAt: new Date(),
            notes: source.notes ?? null,
            isActive: true,
          },
        });

    sourceDocumentIdByKey.set(source.key, sourceDocument.id);
  }

  for (const drug of DRUG_DATABASE_SEED) {
    const existingDrug = await prisma.drugDatabase.findFirst({
      where: { genericName: drug.genericName },
      select: { id: true },
    });

    const drugData = {
      genericName: drug.genericName,
      brandNames: drug.brandNames,
      drugClass: drug.drugClass,
      therapeuticCategory: drug.therapeuticCategory,
      awarClass: drug.awarClass ?? null,
      standardAdultDose: drug.standardAdultDose,
      frequency: drug.frequency,
      route: drug.route,
      paediatricDoseFormula: drug.paediatricDoseFormula,
      elderlyDoseNotes: drug.elderlyDoseNotes,
      pregnancyCategory: drug.pregnancyCategory,
      breastfeedingSafety: drug.breastfeedingSafety,
      elderlyCaution: drug.elderlyCaution ?? false,
      renalCaution: drug.renalCaution ?? false,
      hepaticCaution: drug.hepaticCaution ?? false,
      ncdHints: drug.ncdHints ?? [],
      clinicianReviewed: drug.clinicianReviewed,
    };

    if (existingDrug) {
      await prisma.drugDatabase.update({
        where: { id: existingDrug.id },
        data: drugData,
      });
    } else {
      await prisma.drugDatabase.create({
        data: drugData,
      });
    }
  }

  const allDrugs = await prisma.drugDatabase.findMany({
    select: { id: true, genericName: true },
  });
  const drugIdByGenericName = new Map(allDrugs.map((drug) => [drug.genericName, drug.id]));
  const activeIngredients = await prisma.activeIngredient.findMany({
    select: {
      id: true,
      normalizedName: true,
    },
  });
  const activeIngredientIdByNormalizedName = new Map(
    activeIngredients.map((ingredient) => [ingredient.normalizedName, ingredient.id]),
  );

  for (const interaction of SAFETY_INTERACTION_RULES) {
    const drugAId = drugIdByGenericName.get(interaction.drugA);
    const drugBId = drugIdByGenericName.get(interaction.drugB);
    const sourceDocumentId = sourceDocumentIdByKey.get(interaction.sourceKey);
    if (!drugAId || !drugBId) {
      continue;
    }

    const interactionData = {
      drugAId,
      drugBId,
      severity: interaction.severity,
      effectSummary: interaction.effectSummary,
      management: interaction.management,
      requiresPicPin: interaction.requiresPicPin ?? false,
      sourceDocumentId,
      sourceSection: interaction.sourceSection,
      sourceUrl: interaction.sourceUrl ?? null,
      reviewStatus: (interaction.reviewStatus ?? 'APPROVED') as ReviewStatus,
      importedAt: new Date(),
    };

    const existingInteraction = await prisma.drugInteraction.findFirst({
      where: {
        OR: [
          {
            drugAId,
            drugBId,
          },
          {
            drugAId: drugBId,
            drugBId: drugAId,
          },
        ],
      },
      select: { id: true },
    });

    if (existingInteraction) {
      await prisma.drugInteraction.update({
        where: { id: existingInteraction.id },
        data: interactionData,
      });
    } else {
      await prisma.drugInteraction.create({
        data: interactionData,
      });
    }
  }

  for (const contraindication of SAFETY_CONTRAINDICATION_RULES) {
    const drugId = drugIdByGenericName.get(contraindication.drug);
    const sourceDocumentId = sourceDocumentIdByKey.get(contraindication.sourceKey);
    if (!drugId) {
      continue;
    }

    const existingContraindication = await prisma.drugContraindication.findFirst({
      where: {
        drugId,
        conditionType: contraindication.conditionType,
        conditionValue: contraindication.conditionValue,
      },
      select: { id: true },
    });

    const contraindicationData = {
      drugId,
      conditionType: contraindication.conditionType,
      conditionValue: contraindication.conditionValue,
      severity: contraindication.severity,
      message: contraindication.message,
      requiresPicPin: contraindication.requiresPicPin ?? false,
      sourceDocumentId,
      sourceSection: contraindication.sourceSection,
      sourceUrl: contraindication.sourceUrl ?? null,
      reviewStatus: (contraindication.reviewStatus ?? 'APPROVED') as ReviewStatus,
      importedAt: new Date(),
    };

    if (existingContraindication) {
      await prisma.drugContraindication.update({
        where: { id: existingContraindication.id },
        data: contraindicationData,
      });
    } else {
      await prisma.drugContraindication.create({
        data: contraindicationData,
      });
    }
  }

  for (const warning of SAFETY_WARNING_RULES) {
    const drugDatabaseId = drugIdByGenericName.get(warning.drug);
    const activeIngredientId =
      activeIngredientIdByNormalizedName.get(normalizeText(warning.drug)) ?? null;
    const sourceDocumentId = sourceDocumentIdByKey.get(warning.sourceKey);
    if (!drugDatabaseId) {
      continue;
    }

    const existingWarning = await prisma.warning.findFirst({
      where: {
        drugDatabaseId,
        warningType: warning.warningType,
        message: warning.message,
      },
      select: { id: true },
    });

    const warningData = {
      activeIngredientId,
      drugDatabaseId,
      sourceDocumentId,
      warningType: warning.warningType,
      severity: warning.severity,
      message: warning.message,
      sourceSection: warning.sourceSection,
      sourceUrl: warning.sourceUrl ?? null,
      reviewStatus: (warning.reviewStatus ?? 'APPROVED') as ReviewStatus,
    };

    if (existingWarning) {
      await prisma.warning.update({
        where: { id: existingWarning.id },
        data: warningData,
      });
    } else {
      await prisma.warning.create({ data: warningData });
    }
  }

  for (const flag of SAFETY_PREGNANCY_FLAGS) {
    const drugDatabaseId = drugIdByGenericName.get(flag.drug);
    const activeIngredientId =
      activeIngredientIdByNormalizedName.get(normalizeText(flag.drug)) ?? null;
    const sourceDocumentId = sourceDocumentIdByKey.get(flag.sourceKey);
    if (!drugDatabaseId) {
      continue;
    }

    const existingFlag = await prisma.pregnancyFlag.findFirst({
      where: {
        drugDatabaseId,
        trimester: flag.trimester ?? null,
        message: flag.message,
      },
      select: { id: true },
    });

    const flagData = {
      activeIngredientId,
      drugDatabaseId,
      sourceDocumentId,
      trimester: flag.trimester ?? null,
      riskLevel: flag.riskLevel,
      message: flag.message,
      sourceSection: flag.sourceSection,
      reviewStatus: (flag.reviewStatus ?? 'APPROVED') as ReviewStatus,
    };

    if (existingFlag) {
      await prisma.pregnancyFlag.update({
        where: { id: existingFlag.id },
        data: flagData,
      });
    } else {
      await prisma.pregnancyFlag.create({ data: flagData });
    }
  }

  for (const flag of SAFETY_LACTATION_FLAGS) {
    const drugDatabaseId = drugIdByGenericName.get(flag.drug);
    const activeIngredientId =
      activeIngredientIdByNormalizedName.get(normalizeText(flag.drug)) ?? null;
    const sourceDocumentId = sourceDocumentIdByKey.get(flag.sourceKey);
    if (!drugDatabaseId) {
      continue;
    }

    const existingFlag = await prisma.lactationFlag.findFirst({
      where: {
        drugDatabaseId,
        riskLevel: flag.riskLevel,
        message: flag.message,
      },
      select: { id: true },
    });

    const flagData = {
      activeIngredientId,
      drugDatabaseId,
      sourceDocumentId,
      riskLevel: flag.riskLevel,
      message: flag.message,
      sourceSection: flag.sourceSection,
      reviewStatus: (flag.reviewStatus ?? 'APPROVED') as ReviewStatus,
    };

    if (existingFlag) {
      await prisma.lactationFlag.update({
        where: { id: existingFlag.id },
        data: flagData,
      });
    } else {
      await prisma.lactationFlag.create({ data: flagData });
    }
  }

  for (const flag of SAFETY_RENAL_FLAGS) {
    const drugDatabaseId = drugIdByGenericName.get(flag.drug);
    const activeIngredientId =
      activeIngredientIdByNormalizedName.get(normalizeText(flag.drug)) ?? null;
    const sourceDocumentId = sourceDocumentIdByKey.get(flag.sourceKey);
    if (!drugDatabaseId) {
      continue;
    }

    const existingFlag = await prisma.renalFlag.findFirst({
      where: {
        drugDatabaseId,
        stage: flag.stage,
        message: flag.message,
      },
      select: { id: true },
    });

    const flagData = {
      activeIngredientId,
      drugDatabaseId,
      sourceDocumentId,
      stage: flag.stage,
      severity: flag.severity,
      message: flag.message,
      sourceSection: flag.sourceSection,
      reviewStatus: (flag.reviewStatus ?? 'APPROVED') as ReviewStatus,
    };

    if (existingFlag) {
      await prisma.renalFlag.update({
        where: { id: existingFlag.id },
        data: flagData,
      });
    } else {
      await prisma.renalFlag.create({ data: flagData });
    }
  }

  for (const flag of SAFETY_HEPATIC_FLAGS) {
    const drugDatabaseId = drugIdByGenericName.get(flag.drug);
    const activeIngredientId =
      activeIngredientIdByNormalizedName.get(normalizeText(flag.drug)) ?? null;
    const sourceDocumentId = sourceDocumentIdByKey.get(flag.sourceKey);
    if (!drugDatabaseId) {
      continue;
    }

    const existingFlag = await prisma.hepaticFlag.findFirst({
      where: {
        drugDatabaseId,
        stage: flag.stage,
        message: flag.message,
      },
      select: { id: true },
    });

    const flagData = {
      activeIngredientId,
      drugDatabaseId,
      sourceDocumentId,
      stage: flag.stage,
      severity: flag.severity,
      message: flag.message,
      sourceSection: flag.sourceSection,
      reviewStatus: (flag.reviewStatus ?? 'APPROVED') as ReviewStatus,
    };

    if (existingFlag) {
      await prisma.hepaticFlag.update({
        where: { id: existingFlag.id },
        data: flagData,
      });
    } else {
      await prisma.hepaticFlag.create({ data: flagData });
    }
  }

  const [
    drugCount,
    sourceDocumentCount,
    interactionCount,
    contraindicationCount,
    warningCount,
    pregnancyFlagCount,
    lactationFlagCount,
    renalFlagCount,
    hepaticFlagCount,
  ] = await Promise.all([
    prisma.drugDatabase.count(),
    prisma.sourceDocument.count(),
    prisma.drugInteraction.count(),
    prisma.drugContraindication.count(),
    prisma.warning.count(),
    prisma.pregnancyFlag.count(),
    prisma.lactationFlag.count(),
    prisma.renalFlag.count(),
    prisma.hepaticFlag.count(),
  ]);

  console.log(
    `Seeded ${drugCount} drugs, ${sourceDocumentCount} source documents, ${interactionCount} interactions, ${contraindicationCount} contraindications, ${warningCount} warnings, ${pregnancyFlagCount} pregnancy flags, ${lactationFlagCount} lactation flags, ${renalFlagCount} renal flags, and ${hepaticFlagCount} hepatic flags.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
