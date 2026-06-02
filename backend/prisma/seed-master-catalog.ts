import 'dotenv/config';
import {
  AliasType,
  ImportMethod,
  Prisma,
  PrismaClient,
  ReviewQueueStatus,
  ReviewStatus,
  SourceDocumentType,
  SourceTrustLevel,
} from '@prisma/client';
import {
  MSD_TANZANIA_MASTER_SOURCE,
  NEMLIT_TANZANIA_MASTER_SOURCE,
  TANZANIA_MASTER_CATALOG_SEED,
  type TanzaniaMasterCatalogProductSeed,
  type TanzaniaMasterCatalogIngredientSeed,
} from '../src/data/tanzania-master-catalog-seed';
import { loadNemlitCatalogSeed } from '../src/data/master-catalog-loaders';

type MasterSourceKey = 'MSD' | 'NEMLIT';

type MasterCatalogSeed = TanzaniaMasterCatalogProductSeed & {
  sourceKey: MasterSourceKey;
};

type SourceDocumentSeed = {
  sourceKey: MasterSourceKey;
  sourceName: string;
  title: string;
  url: string;
  sourceType: SourceDocumentType;
  trustLevel: SourceTrustLevel;
  importMethod: ImportMethod;
  issuingAuthority: string;
  documentVersion: string;
  notes: string;
};

const SOURCE_DOCUMENTS: Record<MasterSourceKey, SourceDocumentSeed> = {
  MSD: {
    sourceKey: 'MSD',
    sourceName: MSD_TANZANIA_MASTER_SOURCE.sourceName,
    title: MSD_TANZANIA_MASTER_SOURCE.title,
    url: MSD_TANZANIA_MASTER_SOURCE.url,
    sourceType: SourceDocumentType.MSD_CATALOGUE,
    trustLevel: SourceTrustLevel.PROCUREMENT_PRIMARY,
    importMethod: ImportMethod.PDF_EXTRACTION,
    issuingAuthority: MSD_TANZANIA_MASTER_SOURCE.issuingAuthority,
    documentVersion: MSD_TANZANIA_MASTER_SOURCE.documentVersion,
    notes: MSD_TANZANIA_MASTER_SOURCE.notes,
  },
  NEMLIT: {
    sourceKey: 'NEMLIT',
    sourceName: NEMLIT_TANZANIA_MASTER_SOURCE.sourceName,
    title: NEMLIT_TANZANIA_MASTER_SOURCE.title,
    url: NEMLIT_TANZANIA_MASTER_SOURCE.url,
    sourceType: SourceDocumentType.NEMLIT,
    trustLevel: SourceTrustLevel.OFFICIAL_SECONDARY,
    importMethod: ImportMethod.PDF_EXTRACTION,
    issuingAuthority: NEMLIT_TANZANIA_MASTER_SOURCE.issuingAuthority,
    documentVersion: NEMLIT_TANZANIA_MASTER_SOURCE.documentVersion,
    notes: NEMLIT_TANZANIA_MASTER_SOURCE.notes,
  },
};

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
const dosageFormCache = new Map<string, Awaited<ReturnType<typeof prisma.dosageFormDefinition.upsert>>>();
const routeCache = new Map<string, Awaited<ReturnType<typeof prisma.routeDefinition.upsert>>>();
const packSizeCache = new Map<string, Awaited<ReturnType<typeof prisma.packSizeDefinition.upsert>>>();
const therapeuticClassCache = new Map<string, Awaited<ReturnType<typeof prisma.therapeuticClass.upsert>>>();
const strengthCache = new Map<string, Awaited<ReturnType<typeof prisma.strengthDefinition.upsert>>>();
const ingredientCache = new Map<string, Awaited<ReturnType<typeof prisma.activeIngredient.upsert>>>();
const brandCache = new Map<string, string>(); // normalizedName → id
const manufacturerCache = new Map<string, string>(); // normalizedName → id

function normalizeText(value: string): string {
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

function buildAliasPayloads(
  productId: string,
  seed: Pick<TanzaniaMasterCatalogProductSeed, 'genericName' | 'productName' | 'aliases' | 'ingredients' | 'msdCode' | 'brandName'>,
): Array<{
  drugProductId: string;
  alias: string;
  normalizedAlias: string;
  aliasType: AliasType;
  isPreferred: boolean;
}> {
  const unique = new Map<string, { alias: string; aliasType: AliasType; isPreferred: boolean }>();

  const registerAlias = (alias: string, aliasType: AliasType, isPreferred = false) => {
    const trimmed = alias.trim();
    if (!trimmed) {
      return;
    }

    const normalizedAlias = normalizeText(trimmed);
    if (!normalizedAlias) {
      return;
    }

    const existing = unique.get(normalizedAlias);
    if (!existing || isPreferred) {
      unique.set(normalizedAlias, { alias: trimmed, aliasType, isPreferred });
    }
  };

  if (normalizeText(seed.genericName) !== normalizeText(seed.productName)) {
    registerAlias(seed.genericName, AliasType.GENERIC, true);
  }

  if (seed.msdCode) {
    registerAlias(seed.msdCode, AliasType.MSD_CODE);
  }

  if (seed.brandName) {
    registerAlias(seed.brandName, AliasType.BRAND);
  }

  for (const alias of seed.aliases ?? []) {
    registerAlias(alias, AliasType.SPELLING_VARIANT);
  }

  for (const ingredient of seed.ingredients) {
    if (normalizeText(ingredient.name) !== normalizeText(seed.genericName)) {
      registerAlias(ingredient.name, AliasType.GENERIC);
    }

    for (const alias of ingredient.aliases ?? []) {
      registerAlias(alias, AliasType.SPELLING_VARIANT);
    }
  }

  return Array.from(unique.entries()).map(([normalizedAlias, value]) => ({
    drugProductId: productId,
    alias: value.alias,
    normalizedAlias,
    aliasType: value.aliasType,
    isPreferred: value.isPreferred,
  }));
}

async function upsertSourceDocument(seed: SourceDocumentSeed) {
  const existing = await prisma.sourceDocument.findFirst({
    where: { url: seed.url },
    select: { id: true },
  });

  const data = {
    sourceName: seed.sourceName,
    title: seed.title,
    url: seed.url,
    sourceType: seed.sourceType,
    trustLevel: seed.trustLevel,
    importMethod: seed.importMethod,
    issuingAuthority: seed.issuingAuthority,
    documentVersion: seed.documentVersion,
    lastCheckedAt: new Date(),
    notes: seed.notes,
    isActive: true,
  };

  if (existing) {
    return prisma.sourceDocument.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.sourceDocument.create({ data });
}

async function upsertDosageForm(name: string) {
  const normalizedName = normalizeText(name);
  const cached = dosageFormCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.dosageFormDefinition.upsert({
    where: { normalizedName },
    update: { name, isActive: true },
    create: {
      name,
      normalizedName,
      isActive: true,
    },
  });
  dosageFormCache.set(normalizedName, value);
  return value;
}

async function upsertRoute(name: string) {
  const normalizedName = normalizeText(name);
  const cached = routeCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.routeDefinition.upsert({
    where: { normalizedName },
    update: { name, isActive: true },
    create: {
      name,
      normalizedName,
      isActive: true,
    },
  });
  routeCache.set(normalizedName, value);
  return value;
}

async function upsertPackSize(label: string, quantity?: string, unit?: string) {
  const normalizedName = normalizeText(label);
  const cached = packSizeCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.packSizeDefinition.upsert({
    where: { normalizedName },
    update: {
      displayName: label,
      quantity: quantity ?? null,
      unit: unit ?? null,
    },
    create: {
      displayName: label,
      normalizedName,
      quantity: quantity ?? null,
      unit: unit ?? null,
    },
  });
  packSizeCache.set(normalizedName, value);
  return value;
}

async function upsertTherapeuticClass(name: string) {
  const normalizedName = normalizeText(name);
  const cached = therapeuticClassCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.therapeuticClass.upsert({
    where: { normalizedName },
    update: { name, isActive: true },
    create: {
      name,
      normalizedName,
      isActive: true,
    },
  });
  therapeuticClassCache.set(normalizedName, value);
  return value;
}

async function upsertStrength(displayName: string) {
  const normalizedName = normalizeText(displayName);
  const cached = strengthCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.strengthDefinition.upsert({
    where: { normalizedName },
    update: { displayName, isCombination: displayName.includes('+') || displayName.includes('/') },
    create: {
      displayName,
      normalizedName,
      isCombination: displayName.includes('+') || displayName.includes('/'),
    },
  });
  strengthCache.set(normalizedName, value);
  return value;
}

async function upsertIngredient(seed: TanzaniaMasterCatalogIngredientSeed, therapeuticClassId: string) {
  const normalizedName = normalizeText(seed.name);
  const cached = ingredientCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  const value = await prisma.activeIngredient.upsert({
    where: { normalizedName },
    update: {
      name: seed.name,
      therapeuticClassId,
      reviewStatus: ReviewStatus.IMPORTED,
      isActive: true,
    },
    create: {
      name: seed.name,
      normalizedName,
      therapeuticClassId,
      reviewStatus: ReviewStatus.IMPORTED,
      isActive: true,
    },
  });
  ingredientCache.set(normalizedName, value);
  return value;
}

async function upsertBrand(name: string): Promise<string> {
  const normalizedName = normalizeText(name);
  const cached = brandCache.get(normalizedName);
  if (cached) return cached;
  const brand = await prisma.brand.upsert({
    where: { normalizedName },
    update: { name, isActive: true },
    create: { name, normalizedName, isActive: true },
  });
  brandCache.set(normalizedName, brand.id);
  return brand.id;
}

async function upsertManufacturer(name: string): Promise<string> {
  const normalizedName = normalizeText(name);
  const cached = manufacturerCache.get(normalizedName);
  if (cached) return cached;
  const mfr = await prisma.manufacturer.upsert({
    where: { normalizedName },
    update: { name, isActive: true },
    create: { name, normalizedName, isActive: true },
  });
  manufacturerCache.set(normalizedName, mfr.id);
  return mfr.id;
}

async function ensureReviewQueueEntry(
  productId: string,
  sourceDocumentId: string,
  notes: string,
  payload: Prisma.InputJsonObject,
) {
  const existing = await prisma.dataReviewQueue.findFirst({
    where: {
      entityType: 'DRUG_PRODUCT',
      entityId: productId,
      sourceDocumentId,
      status: ReviewQueueStatus.PENDING_REVIEW,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.dataReviewQueue.update({
      where: { id: existing.id },
      data: {
        currentPayload: payload,
        proposedPayload: payload,
        notes,
      },
    });
    return;
  }

  await prisma.dataReviewQueue.create({
    data: {
      entityType: 'DRUG_PRODUCT',
      entityId: productId,
      sourceDocumentId,
      status: ReviewQueueStatus.PENDING_REVIEW,
      currentPayload: payload,
      proposedPayload: payload,
      notes,
    },
  });
}

async function main() {
  await connectPrisma();

  const msdSeeds: MasterCatalogSeed[] = TANZANIA_MASTER_CATALOG_SEED.map((seed) => ({
    ...seed,
    sourceKey: 'MSD',
  }));
  const nemlitSeeds: MasterCatalogSeed[] = loadNemlitCatalogSeed().map((seed) => ({
    ...seed,
    sourceKey: 'NEMLIT',
  }));
  const allSeeds = [...msdSeeds, ...nemlitSeeds];

  console.log(
    `Seeding Tanzania master catalog with ${msdSeeds.length} MSD products and ${nemlitSeeds.length} NEMLIT products...`,
  );

  const sourceDocuments = {
    MSD: await upsertSourceDocument(SOURCE_DOCUMENTS.MSD),
    NEMLIT: await upsertSourceDocument(SOURCE_DOCUMENTS.NEMLIT),
  };

  const existingProducts = await prisma.drugProduct.findMany({
    select: {
      id: true,
      msdCode: true,
      normalizedProductName: true,
      productName: true,
      genericName: true,
      dosageFormName: true,
      strengthText: true,
      primarySourceDocumentId: true,
    },
  });
  const productIdByMsdCode = new Map<string, string>();
  const productIdBySourceAndName = new Map<string, string>();
  const productIdByGenericFormStrength = new Map<string, string>();
  const productIdByProductName = new Map<string, string>();
  const productMetaById = new Map<
    string,
    {
      id: string;
      msdCode: string | null;
      normalizedProductName: string | null;
      productName: string;
      genericName: string | null;
      dosageFormName: string | null;
      strengthText: string | null;
      primarySourceDocumentId: string | null;
    }
  >();

  const indexProduct = (product: {
    id: string;
    msdCode: string | null;
    normalizedProductName: string | null;
    productName: string;
    genericName: string | null;
    dosageFormName: string | null;
    strengthText: string | null;
    primarySourceDocumentId: string | null;
  }) => {
    productMetaById.set(product.id, product);
    if (product.msdCode) {
      productIdByMsdCode.set(product.msdCode, product.id);
    }
    if (product.primarySourceDocumentId && product.normalizedProductName) {
      productIdBySourceAndName.set(
        `${product.primarySourceDocumentId}:${product.normalizedProductName}`,
        product.id,
      );
    }
    if (product.genericName && product.dosageFormName && product.strengthText) {
      productIdByGenericFormStrength.set(
        [
          normalizeText(product.genericName),
          normalizeText(product.dosageFormName),
          normalizeText(product.strengthText),
        ].join(':'),
        product.id,
      );
    }
    productIdByProductName.set(normalizeText(product.productName), product.id);
  };

  for (const product of existingProducts) {
    indexProduct(product);
  }

  let createdOrUpdatedProducts = 0;
  let createdOrUpdatedIngredients = 0;

  for (const seed of allSeeds) {
    const sourceDocument = sourceDocuments[seed.sourceKey];
    const dosageForm = await upsertDosageForm(seed.dosageFormName);
    const route = seed.routeName ? await upsertRoute(seed.routeName) : null;
    const packSize = await upsertPackSize(seed.packSizeLabel, seed.packSizeQuantity, seed.packSizeUnit);
    const therapeuticClass = await upsertTherapeuticClass(seed.therapeuticClassName);
    const brandId = seed.brandName ? await upsertBrand(seed.brandName) : null;
    const manufacturerId = seed.manufacturer ? await upsertManufacturer(seed.manufacturer) : null;
    const existingProductId =
      (seed.msdCode ? productIdByMsdCode.get(seed.msdCode) : null) ??
      productIdBySourceAndName.get(`${sourceDocument.id}:${normalizeText(seed.productName)}`) ??
      (seed.genericName && seed.dosageFormName && seed.strengthText
        ? productIdByGenericFormStrength.get(
            [
              normalizeText(seed.genericName),
              normalizeText(seed.dosageFormName),
              normalizeText(seed.strengthText),
            ].join(':'),
          )
        : null) ??
      productIdByProductName.get(normalizeText(seed.productName)) ??
      null;
    const existingMeta = existingProductId ? productMetaById.get(existingProductId) ?? null : null;
    const alreadySeededFromSameSource =
      existingMeta?.primarySourceDocumentId === sourceDocument.id &&
      existingMeta.normalizedProductName === normalizeText(seed.productName);

    if (alreadySeededFromSameSource) {
      continue;
    }

    const productData = {
      msdCode: seed.msdCode ?? null,
      tmdaRegistrationNumber: seed.tmdaRegistrationNumber ?? null,
      productName: seed.productName,
      normalizedProductName: normalizeText(seed.productName),
      genericName: seed.genericName,
      brandId: brandId ?? null,
      manufacturerId: manufacturerId ?? null,
      dosageFormId: dosageForm.id,
      dosageFormName: seed.dosageFormName,
      routeId: route?.id ?? null,
      packSizeId: packSize.id,
      packSizeLabel: seed.packSizeLabel,
      therapeuticClassId: therapeuticClass.id,
      primarySourceDocumentId: sourceDocument.id,
      strengthText: seed.strengthText,
      storageCondition: seed.storageCondition ?? 'AMBIENT',
      isColdChain: seed.storageCondition === 'REFRIGERATED' || seed.storageCondition === 'FROZEN',
      isEssentialMedicine: seed.sourceKey === 'NEMLIT' || seed.productName.includes('NEMLIT'),
      registrationStatus: 'UNVERIFIED',
      reviewStatus: ReviewStatus.IMPORTED,
      sourceUrl: seed.sourceUrl,
      unitPrice: seed.unitPrice ?? null,
      category: seed.category,
      isActive: true,
      lastVerifiedAt: new Date(),
    };

    const product = existingProductId
      ? await prisma.drugProduct.update({
          where: { id: existingProductId as string },
          data: productData,
        })
      : seed.tmdaRegistrationNumber
      ? await prisma.drugProduct.upsert({
          where: { tmdaRegistrationNumber: seed.tmdaRegistrationNumber },
          update: productData,
          create: productData,
        })
      : await prisma.drugProduct.create({
          data: productData,
        });

    indexProduct({
      id: product.id,
      msdCode: product.msdCode,
      normalizedProductName: product.normalizedProductName,
      productName: product.productName,
      genericName: product.genericName,
      dosageFormName: product.dosageFormName,
      strengthText: product.strengthText,
      primarySourceDocumentId: product.primarySourceDocumentId,
    });

    await prisma.drugProductIngredient.deleteMany({
      where: { drugProductId: product.id },
    });

    await prisma.productAlias.deleteMany({
      where: { drugProductId: product.id },
    });

    for (const [index, ingredientSeed] of seed.ingredients.entries()) {
      const ingredient = await upsertIngredient(ingredientSeed, therapeuticClass.id);
      const strength = ingredientSeed.strengthText
        ? await upsertStrength(ingredientSeed.strengthText)
        : null;

      await prisma.drugProductIngredient.create({
        data: {
          drugProductId: product.id,
          activeIngredientId: ingredient.id,
          strengthId: strength?.id ?? null,
          strengthText: ingredientSeed.strengthText ?? null,
          ingredientOrder: index + 1,
          isPrimary: index === 0,
        },
      });

      createdOrUpdatedIngredients += 1;
    }

    const aliases = buildAliasPayloads(product.id, seed);
    if (aliases.length > 0) {
      await prisma.productAlias.createMany({ data: aliases });
    }

    await ensureReviewQueueEntry(
      product.id,
      sourceDocument.id,
      seed.reviewNotes ??
        (seed.sourceKey === 'NEMLIT'
          ? 'Imported from NEMLIT 2021. TMDA registration verification is still required before this record is treated as regulatory-confirmed.'
          : 'Imported from MSD FY 2024/2025 catalogue. TMDA registration verification is still required before this record is treated as regulatory-confirmed.'),
      {
        sourceKey: seed.sourceKey,
        msdCode: seed.msdCode ?? null,
        productName: seed.productName,
        genericName: seed.genericName,
        strengthText: seed.strengthText,
        packSizeLabel: seed.packSizeLabel,
        sourceUrl: seed.sourceUrl,
      },
    );

    createdOrUpdatedProducts += 1;
  }

  const [productCount, essentialCount, ingredientCount, aliasCount, reviewQueueCount] = await Promise.all([
    prisma.drugProduct.count(),
    prisma.drugProduct.count({ where: { isEssentialMedicine: true } }),
    prisma.drugProductIngredient.count(),
    prisma.productAlias.count(),
    prisma.dataReviewQueue.count({
      where: {
        entityType: 'DRUG_PRODUCT',
      },
    }),
  ]);

  console.log(
    `Seeded/updated ${createdOrUpdatedProducts} products and ${createdOrUpdatedIngredients} product ingredients.`,
  );
  console.log(
    `Catalog now has ${productCount} products, ${essentialCount} marked essential, ${ingredientCount} product ingredients, ${aliasCount} aliases, and ${reviewQueueCount} product review queue entries.`,
  );
}

main()
  .catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.error(
        'Tanzania master catalog seed requires the Phase 2 schema migration first. Run `npm run db:migrate` against a database that has access to the new master-data tables, then rerun `npm run seed:master-catalog`.',
      );
    }
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
