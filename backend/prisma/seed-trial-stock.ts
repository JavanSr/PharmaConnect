import 'dotenv/config';
import { DosageForm, DrugClass, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TRIAL_BATCH = 'TRIAL-100';
const TRIAL_QUANTITY = 100;

function dosageForm(value?: string | null): DosageForm {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z]+/g, '_');
  return normalized && normalized in DosageForm ? (normalized as DosageForm) : 'OTHER';
}

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: {
      OR: [
        { licenceNumber: 'PH-AR-2024-001' },
        { name: 'Amani Pharmacy' },
      ],
    },
    select: { id: true, name: true },
  });

  if (!pharmacy) {
    throw new Error('Amani Pharmacy was not found. Run the base seed first.');
  }

  const founder = await prisma.user.findUnique({
    where: { email: 'founder@pharmaconnect.tz' },
    select: { id: true },
  });

  if (founder) {
    await prisma.user.update({
      where: { id: founder.id },
      data: { pharmacyId: pharmacy.id },
    });
  }

  const drugs = await prisma.drugProduct.findMany({
    where: { isActive: true },
    orderBy: { productName: 'asc' },
    select: {
      id: true,
      productName: true,
      genericName: true,
      dosageFormName: true,
      strengthText: true,
      storageCondition: true,
      isColdChain: true,
      unitPrice: true,
      therapeuticClass: { select: { name: true } },
    },
  });

  let productsTouched = 0;
  let batchesCreated = 0;
  let batchesToppedUp = 0;

  for (const drug of drugs) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        drugMasterId: drug.id,
      },
      select: { id: true },
    });

    const product = existingProduct
      ? await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: drug.productName,
            genericName: drug.genericName ?? undefined,
            dosageForm: dosageForm(drug.dosageFormName),
            strength: drug.strengthText ?? undefined,
            storageCondition: drug.storageCondition,
            coldChainRequired: drug.isColdChain,
            therapeuticCategory: drug.therapeuticClass?.name ?? undefined,
            isActive: true,
          },
          select: { id: true },
        })
      : await prisma.product.create({
          data: {
            pharmacyId: pharmacy.id,
            drugMasterId: drug.id,
            name: drug.productName,
            genericName: drug.genericName ?? undefined,
            dosageForm: dosageForm(drug.dosageFormName),
            strength: drug.strengthText ?? undefined,
            unitOfMeasure: 'unit',
            drugClass: 'PRESCRIPTION' satisfies DrugClass,
            storageCondition: drug.storageCondition,
            coldChainRequired: drug.isColdChain,
            therapeuticCategory: drug.therapeuticClass?.name ?? undefined,
            sellingPrice: drug.unitPrice ?? 2000,
            reorderLevel: 10,
            retailStock: true,
            wholesaleStock: true,
            isActive: true,
          },
          select: { id: true },
        });
    productsTouched++;

    const batch = await prisma.batch.findFirst({
      where: {
        pharmacyId: pharmacy.id,
        productId: product.id,
        batchNumber: TRIAL_BATCH,
      },
      select: { id: true, quantityRemaining: true },
    });

    if (!batch) {
      await prisma.batch.create({
        data: {
          pharmacyId: pharmacy.id,
          productId: product.id,
          batchNumber: TRIAL_BATCH,
          expiryDate: new Date('2028-12-31'),
          quantityRemaining: TRIAL_QUANTITY,
          purchasePrice: drug.unitPrice ?? 1000,
        },
      });
      batchesCreated++;
      continue;
    }

    if (batch.quantityRemaining < TRIAL_QUANTITY) {
      await prisma.batch.update({
        where: { id: batch.id },
        data: { quantityRemaining: TRIAL_QUANTITY },
      });
      batchesToppedUp++;
    }
  }

  console.log(`Trial stock ready for ${pharmacy.name}: ${productsTouched} products, ${batchesCreated} batches created, ${batchesToppedUp} topped up.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
