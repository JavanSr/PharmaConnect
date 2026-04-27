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
import fs from 'node:fs';
import path from 'node:path';

type ScrapedProduct = {
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  productName: string;
  genericName?: string | null;
  category?: string | null;
  sku?: string | null;
  strengthText?: string | null;
  dosageFormName?: string | null;
  detailUrl?: string | null;
  rawText?: string | null;
  confidence: string;
  notes?: string | null;
};

type ScrapeSnapshot = {
  recordCount: number;
  records: ScrapedProduct[];
};

type SourcePolicy = {
  sourceType: SourceDocumentType;
  trustLevel: SourceTrustLevel;
  importMethod: ImportMethod;
  registrationStatus: string;
  reviewStatus: ReviewStatus;
  createCatalogRows: boolean;
};

const SOURCE_POLICIES: Record<string, SourcePolicy> = {
  TMDA_APPROVED_PRODUCT_INFO: {
    sourceType: SourceDocumentType.SMPC,
    trustLevel: SourceTrustLevel.OFFICIAL_PRIMARY,
    importMethod: ImportMethod.HTML_SCRAPE,
    registrationStatus: 'TMDA_PRODUCT_INFO_LISTED',
    reviewStatus: ReviewStatus.IMPORTED,
    createCatalogRows: true,
  },
  UNICHEM_TANZANIA_PDF: {
    sourceType: SourceDocumentType.OTHER,
    trustLevel: SourceTrustLevel.MANUAL_REVIEW,
    importMethod: ImportMethod.PDF_EXTRACTION,
    registrationStatus: 'MANUFACTURER_LIST_UNVERIFIED',
    reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
    createCatalogRows: true,
  },
  UMOJA_PUBLIC_SHOP: {
    sourceType: SourceDocumentType.OTHER,
    trustLevel: SourceTrustLevel.MANUAL_REVIEW,
    importMethod: ImportMethod.HTML_SCRAPE,
    registrationStatus: 'COMMERCIAL_SOURCE_UNVERIFIED',
    reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
    createCatalogRows: true,
  },
  VITAL_PUBLIC_PRODUCTS: {
    sourceType: SourceDocumentType.OTHER,
    trustLevel: SourceTrustLevel.MANUAL_REVIEW,
    importMethod: ImportMethod.HTML_SCRAPE,
    registrationStatus: 'LOW_CONFIDENCE_COMMERCIAL_SOURCE',
    reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
    createCatalogRows: true,
  },
  GLOBAL_PHARMA_PROFILE: {
    sourceType: SourceDocumentType.OTHER,
    trustLevel: SourceTrustLevel.MANUAL_REVIEW,
    importMethod: ImportMethod.HTML_SCRAPE,
    registrationStatus: 'PROFILE_ONLY',
    reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
    createCatalogRows: false,
  },
  BARIKI_PROFILE: {
    sourceType: SourceDocumentType.OTHER,
    trustLevel: SourceTrustLevel.MANUAL_REVIEW,
    importMethod: ImportMethod.HTML_SCRAPE,
    registrationStatus: 'PROFILE_ONLY',
    reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
    createCatalogRows: false,
  },
};

const DEFAULT_POLICY: SourcePolicy = {
  sourceType: SourceDocumentType.OTHER,
  trustLevel: SourceTrustLevel.MANUAL_REVIEW,
  importMethod: ImportMethod.MANUAL_ENTRY,
  registrationStatus: 'PUBLIC_SOURCE_UNVERIFIED',
  reviewStatus: ReviewStatus.NEEDS_VERIFICATION,
  createCatalogRows: true,
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

function normalizeText(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function clean(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function inferDosageForm(record: ScrapedProduct) {
  if (record.dosageFormName?.trim()) {
    return clean(record.dosageFormName);
  }
  const text = `${record.productName} ${record.genericName ?? ''}`.toLowerCase();
  const candidates = [
    'powder for suspension',
    'powder for injection',
    'solution for injection',
    'film coated tablet',
    'dispersible tablet',
    'suspension',
    'injection',
    'capsule',
    'tablet',
    'syrup',
    'cream',
    'ointment',
    'drops',
    'gel',
    'solution',
    'inhaler',
    'spray',
    'lotion',
  ];
  const match = candidates.find((candidate) => text.includes(candidate));
  return match ? match.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Other';
}

function inferStrength(record: ScrapedProduct) {
  if (record.strengthText?.trim()) {
    return clean(record.strengthText);
  }
  const source = `${record.productName} ${record.genericName ?? ''}`;
  const matches = source.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?\b/gi);
  return matches?.join(' + ') ?? '';
}

function deriveGenericName(record: ScrapedProduct) {
  const value = clean(record.genericName) || clean(record.productName);
  return clean(
    value
      .replace(/\b(?:film coated|dispersible|hard gelatin|solid oral)\b/gi, ' ')
      .replace(/\b(?:tablets?|capsules?|injections?|syrups?|creams?|ointments?|drops|gel|solution|suspension|powder for injection|powder for suspension)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?\b/gi, ' ')
      .replace(/[,;]/g, ' '),
  ) || clean(record.productName);
}

function deriveBrandName(record: ScrapedProduct, genericName: string) {
  const productName = clean(record.productName);
  const genericTokens = normalizeText(genericName).split(' ').filter((token) => token.length >= 4);
  const firstGenericToken = genericTokens.find((token) => normalizeText(productName).includes(token));
  if (firstGenericToken) {
    const productWords = productName.split(/\s+/);
    const genericIndex = productWords.findIndex((word) => normalizeText(word).includes(firstGenericToken));
    if (genericIndex > 0) {
      const prefixBrand = clean(
        productWords
          .slice(0, genericIndex)
          .join(' ')
          .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)\b/gi, ' ')
          .replace(/\b(?:tablets?|capsules?|injections?|syrups?|creams?|ointments?|drops|gel|solution|suspension)\b/gi, ' '),
      );
      if (prefixBrand.length >= 2 && prefixBrand.length <= 80) {
        return prefixBrand;
      }
    }
  }

  const withoutStrength = clean(
    productName
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?\b/gi, ' ')
      .replace(/\b(?:film coated|dispersible|hard gelatin|solid oral)\b/gi, ' ')
      .replace(/\b(?:tablets?|capsules?|injections?|syrups?|creams?|ointments?|drops|gel|solution|suspension|powder for injection|powder for suspension)\b/gi, ' '),
  );
  const normalizedProduct = normalizeText(withoutStrength);
  const normalizedGeneric = normalizeText(genericName);

  if (!normalizedProduct || normalizedProduct === normalizedGeneric || normalizedProduct.includes(normalizedGeneric)) {
    return null;
  }

  return withoutStrength.length >= 2 && withoutStrength.length <= 80 ? withoutStrength : null;
}

function likelyNonMedicine(record: ScrapedProduct) {
  const text = normalizeText(`${record.productName} ${record.category ?? ''}`);
  return /\b(sunscreen|cleanser|toothgel|cosrx|cerave|cetaphil|aloe|quaker|honey|sauce|biscuit|battery|shampoo)\b/.test(text);
}

function productKey(product: {
  primarySourceDocumentId: string | null;
  normalizedProductName: string | null;
}) {
  return `${product.primarySourceDocumentId ?? 'none'}:${product.normalizedProductName ?? ''}`;
}

function genericFormStrengthKey(genericName: string | null, dosageFormName: string | null, strengthText: string | null) {
  return [normalizeText(genericName), normalizeText(dosageFormName), normalizeText(strengthText)].join(':');
}

async function upsertSourceDocuments(records: ScrapedProduct[]) {
  const sourceDocumentByKey = new Map<string, string>();
  const firstRecordBySource = new Map<string, ScrapedProduct>();
  for (const record of records) {
    if (!firstRecordBySource.has(record.sourceKey)) {
      firstRecordBySource.set(record.sourceKey, record);
    }
  }

  for (const record of firstRecordBySource.values()) {
    const policy = SOURCE_POLICIES[record.sourceKey] ?? DEFAULT_POLICY;
    const existing = await prisma.sourceDocument.findFirst({
      where: { url: record.sourceUrl },
      select: { id: true },
    });
    const data = {
      sourceName: record.sourceName,
      title: record.sourceName,
      url: record.sourceUrl,
      sourceType: policy.sourceType,
      trustLevel: policy.trustLevel,
      importMethod: policy.importMethod,
      issuingAuthority: record.sourceName,
      documentVersion: `Public scrape ${new Date().toISOString().slice(0, 10)}`,
      lastCheckedAt: new Date(),
      notes: record.notes ?? null,
      isActive: true,
    };
    const sourceDocument = existing
      ? await prisma.sourceDocument.update({ where: { id: existing.id }, data })
      : await prisma.sourceDocument.create({ data });
    sourceDocumentByKey.set(record.sourceKey, sourceDocument.id);
  }

  return sourceDocumentByKey;
}

async function createManyInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    await insert(rows.slice(index, index + size));
  }
}

async function main() {
  const inputPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? 'data/public-source-scrapes/public-product-scrape-latest.json',
  );
  const snapshot = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as ScrapeSnapshot;
  const records = snapshot.records.filter((record) => {
    const policy = SOURCE_POLICIES[record.sourceKey] ?? DEFAULT_POLICY;
    return policy.createCatalogRows && record.productName !== 'NO_PUBLIC_STRUCTURED_PRODUCT_LIST';
  });
  const sourceDocumentByKey = await upsertSourceDocuments(snapshot.records);

  const existingProducts = await prisma.drugProduct.findMany({
    select: {
      id: true,
      primarySourceDocumentId: true,
      normalizedProductName: true,
      productName: true,
      genericName: true,
      dosageFormName: true,
      strengthText: true,
    },
  });
  const bySourceAndName = new Map(existingProducts.map((product) => [productKey(product), product.id]));
  const byProductName = new Map(existingProducts.map((product) => [normalizeText(product.productName), product.id]));
  const byGenericFormStrength = new Map(
    existingProducts
      .filter((product) => product.genericName && product.dosageFormName)
      .map((product) => [genericFormStrengthKey(product.genericName, product.dosageFormName, product.strengthText), product.id]),
  );

  const productIdByRecordIndex = new Map<number, string>();
  const brandIdByRecordIndex = new Map<number, string>();
  let created = 0;
  let updated = 0;

  for (const [index, record] of records.entries()) {
    const sourceDocumentId = sourceDocumentByKey.get(record.sourceKey);
    if (!sourceDocumentId) {
      continue;
    }
    const policy = SOURCE_POLICIES[record.sourceKey] ?? DEFAULT_POLICY;
    const productName = clean(record.productName);
    const genericName = deriveGenericName(record);
    const brandName = deriveBrandName(record, genericName);
    const dosageFormName = inferDosageForm(record);
    const strengthText = inferStrength(record);
    const normalizedProductName = normalizeText(productName);
    const existingProductId =
      bySourceAndName.get(`${sourceDocumentId}:${normalizedProductName}`) ??
      byProductName.get(normalizedProductName) ??
      byGenericFormStrength.get(genericFormStrengthKey(genericName, dosageFormName, strengthText)) ??
      null;
    const nonMedicine = likelyNonMedicine(record);
    const brand = brandName
      ? await prisma.brand.upsert({
          where: { normalizedName: normalizeText(brandName) },
          update: { name: brandName, isActive: true },
          create: { name: brandName, normalizedName: normalizeText(brandName), isActive: true },
        })
      : null;
    const data = {
      productName,
      normalizedProductName,
      genericName,
      brandId: brand?.id ?? null,
      dosageFormName,
      strengthText,
      primarySourceDocumentId: sourceDocumentId,
      sourceUrl: record.detailUrl ?? record.sourceUrl,
      registrationStatus: nonMedicine ? 'LOW_CONFIDENCE_NON_MEDICINE_REVIEW' : policy.registrationStatus,
      reviewStatus: nonMedicine ? ReviewStatus.NEEDS_VERIFICATION : policy.reviewStatus,
      category: record.category ?? record.sourceKey,
      isActive: true,
      lastVerifiedAt: new Date(),
    };

    const product = existingProductId
      ? await prisma.drugProduct.update({ where: { id: existingProductId }, data })
      : await prisma.drugProduct.create({ data });

    if (existingProductId) {
      updated += 1;
    } else {
      created += 1;
    }

    productIdByRecordIndex.set(index, product.id);
    if (brand) {
      brandIdByRecordIndex.set(index, brand.id);
    }
    bySourceAndName.set(`${sourceDocumentId}:${normalizedProductName}`, product.id);
    byProductName.set(normalizedProductName, product.id);
    byGenericFormStrength.set(genericFormStrengthKey(genericName, dosageFormName, strengthText), product.id);
  }

  const productIds = [...new Set(productIdByRecordIndex.values())];
  const existingAliases = await prisma.productAlias.findMany({
    where: { drugProductId: { in: productIds } },
    select: { drugProductId: true, normalizedAlias: true, aliasType: true },
  });
  const aliasKeys = new Set(
    existingAliases.map((alias) => `${alias.drugProductId}:${alias.normalizedAlias}:${alias.aliasType}`),
  );
  const aliasRows: Prisma.ProductAliasCreateManyInput[] = [];

  const addAlias = (productId: string, sourceDocumentId: string | undefined, alias: string | null | undefined, aliasType: AliasType) => {
    const trimmed = clean(alias);
    const normalizedAlias = normalizeText(trimmed);
    if (!trimmed || !normalizedAlias) {
      return;
    }
    const key = `${productId}:${normalizedAlias}:${aliasType}`;
    if (aliasKeys.has(key)) {
      return;
    }
    aliasKeys.add(key);
    aliasRows.push({
      drugProductId: productId,
      sourceDocumentId,
      alias: trimmed,
      normalizedAlias,
      aliasType,
      isPreferred: aliasType === AliasType.GENERIC,
    });
  };

  const queueRows: Prisma.DataReviewQueueCreateManyInput[] = [];
  const existingQueue = await prisma.dataReviewQueue.findMany({
    where: {
      entityType: 'DRUG_PRODUCT',
      entityId: { in: productIds },
      status: ReviewQueueStatus.PENDING_REVIEW,
    },
    select: { entityId: true, sourceDocumentId: true },
  });
  const queueKeys = new Set(existingQueue.map((entry) => `${entry.entityId}:${entry.sourceDocumentId ?? ''}`));

  for (const [index, record] of records.entries()) {
    const productId = productIdByRecordIndex.get(index);
    const sourceDocumentId = sourceDocumentByKey.get(record.sourceKey);
    if (!productId || !sourceDocumentId) {
      continue;
    }
    const genericName = deriveGenericName(record);
    const brandId = brandIdByRecordIndex.get(index);
    addAlias(productId, sourceDocumentId, record.productName, AliasType.SPELLING_VARIANT);
    if (brandId) {
      addAlias(productId, sourceDocumentId, record.productName, AliasType.BRAND);
    }
    addAlias(productId, sourceDocumentId, genericName, AliasType.GENERIC);
    addAlias(productId, sourceDocumentId, record.genericName, AliasType.GENERIC);
    addAlias(productId, sourceDocumentId, record.sku, AliasType.LOCAL_NAME);

    const queueKey = `${productId}:${sourceDocumentId}`;
    if (queueKeys.has(queueKey)) {
      continue;
    }
    queueKeys.add(queueKey);
    const policy = SOURCE_POLICIES[record.sourceKey] ?? DEFAULT_POLICY;
    const payload: Prisma.InputJsonObject = {
      sourceKey: record.sourceKey,
      sourceName: record.sourceName,
      productName: record.productName,
      genericName: record.genericName ?? null,
      sku: record.sku ?? null,
      category: record.category ?? null,
      confidence: record.confidence,
      sourceUrl: record.sourceUrl,
      detailUrl: record.detailUrl ?? null,
      rawText: record.rawText ?? null,
      registrationStatus: policy.registrationStatus,
    };
    queueRows.push({
      entityType: 'DRUG_PRODUCT',
      entityId: productId,
      sourceDocumentId,
      status: ReviewQueueStatus.PENDING_REVIEW,
      reviewerType: 'PLATFORM_PHARMACIST',
      currentPayload: payload,
      proposedPayload: payload,
      notes: `Public scrape candidate from ${record.sourceName}. ${record.notes ?? ''}`.trim(),
    });
  }

  await createManyInChunks(aliasRows, (chunk) => prisma.productAlias.createMany({ data: chunk }), 500);
  await createManyInChunks(queueRows, (chunk) => prisma.dataReviewQueue.createMany({ data: chunk }), 300);

  const [productCount, aliasCount, reviewQueueCount] = await Promise.all([
    prisma.drugProduct.count(),
    prisma.productAlias.count(),
    prisma.dataReviewQueue.count({ where: { entityType: 'DRUG_PRODUCT' } }),
  ]);

  console.log(
    JSON.stringify(
      {
        input: inputPath,
        sourceRecords: snapshot.recordCount,
        importableRecords: records.length,
        created,
        updated,
        skipped: snapshot.recordCount - records.length,
        aliasRowsAdded: aliasRows.length,
        reviewQueueRowsAdded: queueRows.length,
        productCount,
        aliasCount,
        reviewQueueCount,
      },
      null,
      2,
    ),
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
