import { PrismaClient } from '@prisma/client';
import {
  DRUG_CONTRAINDICATION_SEED,
  DRUG_DATABASE_SEED,
  DRUG_INTERACTION_SEED,
} from '../src/data/drug-database-seed';

const prisma = new PrismaClient();

async function main() {
  await prisma.drugInteraction.deleteMany();
  await prisma.drugContraindication.deleteMany();
  await prisma.drugDatabase.deleteMany();

  for (const drug of DRUG_DATABASE_SEED) {
    await prisma.drugDatabase.create({
      data: {
        genericName: drug.genericName,
        brandNames: drug.brandNames,
        drugClass: drug.drugClass,
        therapeuticCategory: drug.therapeuticCategory,
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
      },
    });
  }

  const allDrugs = await prisma.drugDatabase.findMany({
    select: { id: true, genericName: true },
  });
  const drugIdByGenericName = new Map(allDrugs.map((drug) => [drug.genericName, drug.id]));

  for (const interaction of DRUG_INTERACTION_SEED) {
    const drugAId = drugIdByGenericName.get(interaction.drugA);
    const drugBId = drugIdByGenericName.get(interaction.drugB);
    if (!drugAId || !drugBId) {
      continue;
    }

    await prisma.drugInteraction.create({
      data: {
        drugAId,
        drugBId,
        severity: interaction.severity,
        effectSummary: interaction.effectSummary,
        management: interaction.management,
        requiresPicPin: interaction.requiresPicPin ?? false,
      },
    });
  }

  for (const contraindication of DRUG_CONTRAINDICATION_SEED) {
    const drugId = drugIdByGenericName.get(contraindication.drug);
    if (!drugId) {
      continue;
    }

    await prisma.drugContraindication.create({
      data: {
        drugId,
        conditionType: contraindication.conditionType,
        conditionValue: contraindication.conditionValue,
        severity: contraindication.severity,
        message: contraindication.message,
        requiresPicPin: contraindication.requiresPicPin ?? false,
      },
    });
  }

  const [drugCount, interactionCount, contraindicationCount] = await Promise.all([
    prisma.drugDatabase.count(),
    prisma.drugInteraction.count(),
    prisma.drugContraindication.count(),
  ]);

  console.log(`Seeded ${drugCount} drugs, ${interactionCount} interactions, ${contraindicationCount} contraindications.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
