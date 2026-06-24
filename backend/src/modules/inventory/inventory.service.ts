import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { clampLocalTimestamp } from '../../lib/timestamps';
import { Prisma, type MovementType, type SyncConflictStatus } from '@prisma/client';

type ProductWriteInput = {
  name: string;
  genericName?: string;
  brandName?: string;
  sku?: string;
  barcode?: string;
  dosageForm?: string;
  strength?: string;
  unitOfMeasure?: string;
  drugClass?: string;
  description?: string;
  reorderLevel?: number;
  sellingPrice?: number;
  tmda?: string;
  tmdaRegistrationNumber?: string;
  coldChainRequired?: boolean;
  storageCondition?: string;
  retailStock?: boolean;
  wholesaleStock?: boolean;
  wholesaleSellingPrice?: number;
  manufacturer?: string;
  therapeuticCategory?: string;
  drugMasterId?: string;
  lastSupplierId?: string;
};

type ProductVerificationStatus = 'MASTER_CATALOG_MATCHED' | 'UNVERIFIED';
type AwarClass = 'ACCESS' | 'WATCH' | 'RESERVE';

type SupplierWriteInput = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type CsvImportResult = {
  inserted: number;
  errors: Array<{ row: number; field: string; message: string }>;
};

type StockAdjustmentSuggestionPhoto = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

type SuggestionReviewStatus = 'APPROVED' | 'REJECTED' | 'PARTIAL';

type ProductLookupSummary = {
  id: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  barcode: string | null;
  dosageForm: string;
  strength: string | null;
};

type ProductSuggestionParams = {
  search?: string;
  barcode?: string;
  sku?: string;
  limit?: number;
};

type EnterpriseTransferInput = {
  destinationPharmacyId: string;
  productId: string;
  batchId?: string;
  destinationProductId?: string;
  quantity: number;
  notes?: string;
};

type ParsedGs1Barcode = {
  raw: string;
  normalizedBarcode: string;
  gtin: string;
  digitalLink: string;
};

const DOSAGE_FORM_ALIASES: Record<string, string> = {
  TABLET: 'TABLET',
  TABLETS: 'TABLET',
  CAPSULE: 'CAPSULE',
  CAPSULES: 'CAPSULE',
  SYRUP: 'SYRUP',
  INJECTION: 'INJECTION',
  INJECTIONS: 'INJECTION',
  CREAM: 'CREAM',
  OINTMENT: 'OINTMENT',
  DROPS: 'DROPS',
  DROP: 'DROPS',
  INHALER: 'INHALER',
  INHALERS: 'INHALER',
  SUPPOSITORY: 'SUPPOSITORY',
  SUPPOSITORIES: 'SUPPOSITORY',
  POWDER: 'POWDER',
  SOLUTION: 'SOLUTION',
};

function uniqueTruthy(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  );
}

function stockAdjustmentSuggestionInclude() {
  return {
    product: {
      select: {
        id: true,
        name: true,
        genericName: true,
      },
    },
    batch: {
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
      },
    },
    creator: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
    reviewer: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
  };
}

function receivingBarcodeProductSelect() {
  return {
    id: true,
    name: true,
    genericName: true,
    brandName: true,
    barcode: true,
    dosageForm: true,
    strength: true,
  } satisfies Prisma.ProductSelect;
}

function productInclude() {
  return {
    batches: {
      where: { quantityRemaining: { gt: 0 } },
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
        quantityRemaining: true,
        receivedAt: true,
      },
      orderBy: [{ expiryDate: 'asc' as const }, { receivedAt: 'asc' as const }],
    },
  };
}

function toProductData(pharmacyId: string, data: ProductWriteInput): Prisma.ProductUncheckedCreateInput {
  return {
    pharmacyId,
    name: data.name.trim(),
    genericName: data.genericName?.trim() || undefined,
    brandName: data.brandName?.trim() || undefined,
    sku: data.sku?.trim() || undefined,
    barcode: data.barcode?.trim() || undefined,
    dosageForm: (data.dosageForm as any) || 'TABLET',
    strength: data.strength?.trim() || undefined,
    unitOfMeasure: data.unitOfMeasure?.trim() || 'unit',
    drugClass: (data.drugClass as any) || 'OTC',
    description: data.description?.trim() || undefined,
    reorderLevel: data.reorderLevel ?? 10,
    sellingPrice: data.sellingPrice,
    tmda: data.tmda?.trim() || undefined,
    tmdaRegistrationNumber: data.tmdaRegistrationNumber?.trim() || undefined,
    coldChainRequired: data.coldChainRequired ?? false,
    storageCondition: data.storageCondition?.trim() || 'AMBIENT',
    retailStock: data.retailStock ?? true,
    wholesaleStock: data.wholesaleStock ?? false,
    wholesaleSellingPrice: data.wholesaleSellingPrice,
    manufacturer: data.manufacturer?.trim() || undefined,
    therapeuticCategory: data.therapeuticCategory?.trim() || undefined,
    drugMasterId: data.drugMasterId || undefined,
    lastSupplierId: data.lastSupplierId?.trim() || undefined,
  };
}

function buildTransferProductMatch(
  sourceProduct: {
    drugMasterId: string | null;
    barcode: string | null;
    sku: string | null;
    name: string;
    genericName: string | null;
    strength: string | null;
    dosageForm: string;
  },
): Prisma.ProductWhereInput[] {
  const matches: Prisma.ProductWhereInput[] = [];

  if (sourceProduct.drugMasterId) {
    matches.push({ drugMasterId: sourceProduct.drugMasterId });
  }

  if (sourceProduct.barcode) {
    matches.push({ barcode: sourceProduct.barcode });
  }

  if (sourceProduct.sku) {
    matches.push({ sku: sourceProduct.sku });
  }

  matches.push({
    name: { equals: sourceProduct.name, mode: 'insensitive' },
    dosageForm: sourceProduct.dosageForm as any,
    ...(sourceProduct.strength ? { strength: { equals: sourceProduct.strength, mode: 'insensitive' } } : {}),
  });

  if (sourceProduct.genericName) {
    matches.push({
      genericName: { equals: sourceProduct.genericName, mode: 'insensitive' },
      dosageForm: sourceProduct.dosageForm as any,
      ...(sourceProduct.strength ? { strength: { equals: sourceProduct.strength, mode: 'insensitive' } } : {}),
    });
  }

  return matches;
}

async function resolveDestinationProductForTransfer(
  tx: Prisma.TransactionClient,
  destinationPharmacyId: string,
  destinationProductId: string | undefined,
  sourceProduct: Prisma.ProductGetPayload<{}>,
) {
  if (destinationProductId) {
    const destinationProduct = await tx.product.findFirst({
      where: {
        id: destinationProductId,
        pharmacyId: destinationPharmacyId,
        isActive: true,
      },
    });

    if (!destinationProduct) {
      throw Object.assign(new Error('Destination product not found'), {
        status: 404,
        code: 'DESTINATION_PRODUCT_NOT_FOUND',
      });
    }

    return { product: destinationProduct, created: false };
  }

  const existingProduct = await tx.product.findFirst({
    where: {
      pharmacyId: destinationPharmacyId,
      isActive: true,
      OR: buildTransferProductMatch(sourceProduct),
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  if (existingProduct) {
    return { product: existingProduct, created: false };
  }

  const createdProduct = await tx.product.create({
    data: toProductData(destinationPharmacyId, {
      name: sourceProduct.name,
      genericName: sourceProduct.genericName ?? undefined,
      brandName: sourceProduct.brandName ?? undefined,
      sku: sourceProduct.sku ?? undefined,
      barcode: sourceProduct.barcode ?? undefined,
      dosageForm: sourceProduct.dosageForm,
      strength: sourceProduct.strength ?? undefined,
      unitOfMeasure: sourceProduct.unitOfMeasure,
      drugClass: sourceProduct.drugClass,
      description: sourceProduct.description ?? undefined,
      reorderLevel: sourceProduct.reorderLevel,
      sellingPrice: sourceProduct.sellingPrice == null ? undefined : Number(sourceProduct.sellingPrice),
      tmda: sourceProduct.tmda ?? undefined,
      tmdaRegistrationNumber: sourceProduct.tmdaRegistrationNumber ?? undefined,
      coldChainRequired: sourceProduct.coldChainRequired,
      storageCondition: sourceProduct.storageCondition,
      retailStock: sourceProduct.retailStock,
      wholesaleStock: sourceProduct.wholesaleStock,
      wholesaleSellingPrice:
        sourceProduct.wholesaleSellingPrice == null ? undefined : Number(sourceProduct.wholesaleSellingPrice),
      manufacturer: sourceProduct.manufacturer ?? undefined,
      therapeuticCategory: sourceProduct.therapeuticCategory ?? undefined,
      drugMasterId: sourceProduct.drugMasterId ?? undefined,
    }),
  });

  await syncUnverifiedProductReviewQueue(tx, destinationPharmacyId, createdProduct);

  return { product: createdProduct, created: true };
}

function formatMasterProductName(masterProduct: {
  productName: string;
  genericName: string | null;
  brand: { name: string } | null;
}) {
  if (masterProduct.brand?.name && masterProduct.genericName) {
    return `${masterProduct.genericName} (${masterProduct.brand.name})`;
  }

  return masterProduct.genericName || masterProduct.productName;
}

function normalizeDosageFormValue(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return DOSAGE_FORM_ALIASES[normalized] ?? 'OTHER';
}

async function hydrateProductWriteInputFromMaster(
  data: ProductWriteInput,
): Promise<ProductWriteInput> {
  if (!data.drugMasterId) {
    return data;
  }

  const masterProduct = await prisma.drugProduct.findUnique({
    where: { id: data.drugMasterId },
    include: {
      brand: { select: { name: true } },
      manufacturer: { select: { name: true } },
      therapeuticClass: { select: { name: true } },
      dosageForm: { select: { name: true } },
      packSize: { select: { quantity: true, unit: true } },
    },
  });

  if (!masterProduct || !masterProduct.isActive) {
    throw Object.assign(new Error('Master catalog product not found'), { status: 404 });
  }

  return {
    ...data,
    name: data.name?.trim() || formatMasterProductName(masterProduct),
    genericName: data.genericName?.trim() || masterProduct.genericName || masterProduct.productName,
    brandName: data.brandName?.trim() || masterProduct.brand?.name || undefined,
    dosageForm:
      normalizeDosageFormValue(data.dosageForm) ??
      normalizeDosageFormValue(masterProduct.dosageFormName) ??
      normalizeDosageFormValue(masterProduct.dosageForm?.name) ??
      undefined,
    strength: data.strength?.trim() || masterProduct.strengthText || undefined,
    unitOfMeasure: data.unitOfMeasure?.trim() || masterProduct.packSize?.unit || undefined,
    tmdaRegistrationNumber:
      data.tmdaRegistrationNumber?.trim() || masterProduct.tmdaRegistrationNumber || undefined,
    coldChainRequired: data.coldChainRequired ?? masterProduct.isColdChain,
    storageCondition: data.storageCondition?.trim() || masterProduct.storageCondition,
    manufacturer: data.manufacturer?.trim() || masterProduct.manufacturer?.name || undefined,
    therapeuticCategory:
      data.therapeuticCategory?.trim() || masterProduct.therapeuticClass?.name || undefined,
  };
}

function getProductVerificationStatus(product: { drugMasterId: string | null }): ProductVerificationStatus {
  return product.drugMasterId ? 'MASTER_CATALOG_MATCHED' : 'UNVERIFIED';
}

async function syncUnverifiedProductReviewQueue(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  product: {
    id: string;
    name: string;
    genericName: string | null;
    brandName: string | null;
    dosageForm: string;
    strength: string | null;
    tmdaRegistrationNumber: string | null;
    drugMasterId: string | null;
  },
) {
  const existingEntries = await tx.dataReviewQueue.findMany({
    where: {
      entityType: 'PHARMACY_PRODUCT',
      entityId: product.id,
      pharmacyId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (product.drugMasterId) {
    if (existingEntries.length > 0) {
      await tx.dataReviewQueue.updateMany({
        where: {
          entityType: 'PHARMACY_PRODUCT',
          entityId: product.id,
          pharmacyId,
          status: {
            in: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'],
          },
        },
        data: {
          status: 'RETIRED',
          notes: 'Review queue retired after linking the product to the master catalog.',
          reviewedAt: new Date(),
        },
      });
    }
    return;
  }

  const payload: Prisma.InputJsonObject = {
    productId: product.id,
    name: product.name,
    genericName: product.genericName,
    brandName: product.brandName,
    dosageForm: product.dosageForm,
    strength: product.strength,
    tmdaRegistrationNumber: product.tmdaRegistrationNumber,
    verificationStatus: getProductVerificationStatus(product),
  };

  const latestPending = existingEntries.find((entry) =>
    ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'].includes(entry.status),
  );

  if (latestPending) {
    await tx.dataReviewQueue.update({
      where: { id: latestPending.id },
      data: {
        status: 'PENDING_REVIEW',
        currentPayload: payload,
        proposedPayload: payload,
        notes:
          'Manual pharmacy product entry without a linked master-catalog record. Review for future catalog matching.',
        reviewerType: 'TMDA_REFERENCE',
      },
    });
    return;
  }

  await tx.dataReviewQueue.create({
    data: {
      entityType: 'PHARMACY_PRODUCT',
      entityId: product.id,
      pharmacyId,
      status: 'PENDING_REVIEW',
      reviewerType: 'TMDA_REFERENCE',
      currentPayload: payload,
      proposedPayload: payload,
      notes:
        'Manual pharmacy product entry without a linked master-catalog record. Review for future catalog matching.',
    },
  });
}

function enrichProductsWithVerification<T extends {
  id: string;
  drugMasterId: string | null;
}>(products: T[], pendingReviewByEntityId: Map<string, { status: string }>) {
  return products.map((product) => ({
    ...product,
    verificationStatus: getProductVerificationStatus(product),
    masterCatalogMatched: Boolean(product.drugMasterId),
    pendingReview: pendingReviewByEntityId.has(product.id),
    reviewQueueStatus: pendingReviewByEntityId.get(product.id)?.status ?? null,
  }));
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value || value.trim() === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBarcodeInput(value: string) {
  return value.trim();
}

function normalizeCatalogSearchValue(value?: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function isAwarClass(value: string | null): value is AwarClass {
  return value === 'ACCESS' || value === 'WATCH' || value === 'RESERVE';
}

async function enrichProductsWithAwarClass<T extends {
  name: string;
  genericName?: string | null;
  awarClass?: string | null;
}>(products: T[]): Promise<Array<T & { awarClass: AwarClass | null }>> {
  if (products.length === 0) {
    return [];
  }

  const lookupNames = uniqueTruthy(products.map((product) => product.genericName ?? product.name));
  const awarRows = lookupNames.length > 0
    ? await prisma.drugDatabase.findMany({
        where: {
          awarClass: { not: null },
          OR: lookupNames.map((name) => ({
            genericName: { equals: name, mode: 'insensitive' as const },
          })),
        },
        select: { genericName: true, awarClass: true },
      })
    : [];
  const awarMatches = awarRows
    .filter((row): row is { genericName: string; awarClass: AwarClass } => isAwarClass(row.awarClass))
    .map((row) => ({
      genericName: normalizeCatalogSearchValue(row.genericName),
      awarClass: row.awarClass,
    }));

  return products.map((product) => {
    const explicitAwarClass = product.awarClass ?? null;
    if (isAwarClass(explicitAwarClass)) {
      return { ...product, awarClass: explicitAwarClass };
    }

    const productTerms = [
      normalizeCatalogSearchValue(product.genericName),
      normalizeCatalogSearchValue(product.name),
    ].filter(Boolean);
    const match = awarMatches.find((row) =>
      productTerms.some((term) => term === row.genericName || term.includes(row.genericName)),
    );

    return { ...product, awarClass: match?.awarClass ?? null };
  });
}

function productSearchIdentity(product: {
  drugMasterId?: string | null;
  genericName?: string | null;
  name: string;
  strength?: string | null;
  dosageForm: string;
}) {
  if (product.drugMasterId) {
    return `master:${product.drugMasterId}`;
  }

  return [
    normalizeCatalogSearchValue(product.genericName || product.name),
    normalizeCatalogSearchValue(product.strength),
    normalizeCatalogSearchValue(product.dosageForm),
  ].join('::');
}

function sortProductsByStockAndRecency<T extends {
  name: string;
  currentStock?: number | null;
  createdAt: Date | string;
}>(products: T[]) {
  return [...products].sort((left, right) => {
    const stockDiff = (right.currentStock ?? 0) - (left.currentStock ?? 0);
    if (stockDiff !== 0) {
      return stockDiff;
    }

    const createdAtDiff =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

function collapseProductSearchResults<T extends {
  id: string;
  name: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm: string;
  drugMasterId?: string | null;
  currentStock?: number | null;
  createdAt: Date | string;
}>(products: T[]) {
  const bestByIdentity = new Map<string, T>();

  for (const product of sortProductsByStockAndRecency(products)) {
    const identity = productSearchIdentity(product);
    if (!bestByIdentity.has(identity)) {
      bestByIdentity.set(identity, product);
    }
  }

  return sortProductsByStockAndRecency([...bestByIdentity.values()]);
}

function collapseProductSearchResultsInOrder<T extends {
  id: string;
  name: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm: string;
  drugMasterId?: string | null;
}>(products: T[]) {
  const seen = new Set<string>();
  const collapsed: T[] = [];

  for (const product of products) {
    const identity = productSearchIdentity(product);
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    collapsed.push(product);
  }

  return collapsed;
}

function rankProductSuggestion(product: {
  genericName?: string | null;
  brandName?: string | null;
}, search: string) {
  const query = normalizeCatalogSearchValue(search);
  if (!query) {
    return 0;
  }

  const score = (
    value: string | null | undefined,
    exact: number,
    fieldStartsWith: number,
    wordStartsWith: number,
    contains: number,
  ) => {
    const normalized = normalizeCatalogSearchValue(value);
    if (!normalized) {
      return Number.POSITIVE_INFINITY;
    }
    if (normalized === query) {
      return exact;
    }
    if (normalized.startsWith(query)) {
      return fieldStartsWith;
    }
    if (normalized.split(' ').some((word) => word.startsWith(query))) {
      return wordStartsWith;
    }
    return normalized.includes(query) ? contains : Number.POSITIVE_INFINITY;
  };

  return Math.min(
    score(product.genericName, 0, 2, 4, 80),
    score(product.brandName, 1, 3, 5, 82),
  );
}

const STRONG_SUGGESTION_RANK_CUTOFF = 80;

function sortProductsBySuggestionRelevance<T extends {
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  currentStock?: number | null;
  createdAt: Date | string;
}>(products: T[], search: string) {
  return [...products].sort((left, right) => {
    const rankDiff = rankProductSuggestion(left, search) - rankProductSuggestion(right, search);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    const stockDiff = (right.currentStock ?? 0) - (left.currentStock ?? 0);
    if (stockDiff !== 0) {
      return stockDiff;
    }

    const createdAtDiff =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

function parseGs1Barcode(value: string): ParsedGs1Barcode | null {
  const raw = normalizeBarcodeInput(value);
  if (!raw) {
    return null;
  }

  const digitalLinkMatch = raw.match(/\/01\/(\d{8,14})(?:[/?#]|$)/);
  if (digitalLinkMatch) {
    const gtin = digitalLinkMatch[1].padStart(14, '0');
    return {
      raw,
      normalizedBarcode: raw,
      gtin,
      digitalLink: `https://id.gs1.org/01/${gtin}`,
    };
  }

  const digitsOnly = raw.replace(/\s+/g, '');
  if (!/^\d{8,14}$/.test(digitsOnly)) {
    return null;
  }

  const gtin = digitsOnly.padStart(14, '0');
  return {
    raw,
    normalizedBarcode: digitsOnly,
    gtin,
    digitalLink: `https://id.gs1.org/01/${gtin}`,
  };
}

function parseCsv(csv: string): Array<Record<string, string>> {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].split(',').map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const cells = row.split(',').map((cell) => cell.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });
}

export async function listProducts(
  pharmacyId: string,
  params: { search?: string; barcode?: string; sku?: string; page?: number; limit?: number; isActive?: boolean; storageCondition?: string; sortBy?: string; lowStock?: boolean },
) {
  const { search, barcode, sku, page = 1, limit = 50, isActive = true, storageCondition, sortBy, lowStock } = params;
  const skip = (page - 1) * limit;

  if ((barcode || sku) && !search) {
    const products = await withPrismaRetry(() => prisma.product.findMany({
      where: {
        pharmacyId,
        isActive,
        ...(barcode ? { barcode } : {}),
        ...(sku ? { sku } : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        pharmacyId: true,
        name: true,
        genericName: true,
        brandName: true,
        sku: true,
        barcode: true,
        dosageForm: true,
        strength: true,
        unitOfMeasure: true,
        drugClass: true,
        description: true,
        reorderLevel: true,
        sellingPrice: true,
        tmda: true,
        tmdaRegistrationNumber: true,
        coldChainRequired: true,
        storageCondition: true,
        retailStock: true,
        wholesaleStock: true,
        wholesaleSellingPrice: true,
        manufacturer: true,
        therapeuticCategory: true,
        drugMasterId: true,
        isActive: true,
        createdAt: true,
      },
    }));

    const pendingReviewEntries = await prisma.dataReviewQueue.findMany({
      where: {
        pharmacyId,
        entityType: 'PHARMACY_PRODUCT',
        entityId: { in: products.map((product) => product.id) },
        status: {
          in: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'],
        },
      },
      select: {
        entityId: true,
        status: true,
      },
    });

    const pendingReviewByEntityId = new Map(
      pendingReviewEntries.map((entry) => [entry.entityId, { status: entry.status }]),
    );

    const verifiedProducts = enrichProductsWithVerification(products, pendingReviewByEntityId);

    return {
      data: await enrichProductsWithAwarClass(verifiedProducts),
      total: products.length,
      page: 1,
      limit,
      totalPages: products.length > 0 ? 1 : 0,
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sortBy === 'name'      ? { name: 'asc' } :
    sortBy === 'stock-low' ? { name: 'asc' } :  // sorted in memory after stock compute
    sortBy === 'created'   ? { createdAt: 'desc' } :
    { createdAt: 'asc' }; // chronological / expiry-first sorted in memory

  const where: Prisma.ProductWhereInput = {
    pharmacyId,
    isActive,
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    ...(storageCondition ? { storageCondition } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { batches: { some: { batchNumber: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [products, total] = await withPrismaRetry(() => Promise.all([
    prisma.product.findMany({
      where,
      skip: lowStock ? 0 : skip,      // fetch all when filtering by low stock (pagination applied in memory)
      take: lowStock ? undefined : limit,
      orderBy,
      include: productInclude(),
    }),
    prisma.product.count({ where }),
  ]));

  const pendingReviewEntries = await prisma.dataReviewQueue.findMany({
    where: {
      pharmacyId,
      entityType: 'PHARMACY_PRODUCT',
      entityId: { in: products.map((product) => product.id) },
      status: {
        in: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'],
      },
    },
    select: {
      entityId: true,
      status: true,
    },
  });

  const pendingReviewByEntityId = new Map(
    pendingReviewEntries.map((entry) => [entry.entityId, { status: entry.status }]),
  );

  let verifiedProducts = enrichProductsWithVerification(products, pendingReviewByEntityId).map((product) => ({
    ...product,
    currentStock: product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0),
    nextExpiringBatch: product.batches[0] ?? null,
  }));

  if (lowStock) {
    verifiedProducts = verifiedProducts.filter((p) => (p.currentStock ?? 0) <= p.reorderLevel);
  }

  const enriched = await enrichProductsWithAwarClass(verifiedProducts);

  let sorted: typeof enriched;
  if (search) {
    sorted = collapseProductSearchResults(enriched);
  } else if (sortBy === 'stock-low') {
    sorted = [...enriched].sort((a, b) => (a.currentStock ?? 0) - (b.currentStock ?? 0));
  } else if (sortBy === 'name') {
    sorted = enriched; // already ordered by name in DB query
  } else {
    sorted = sortProductsByStockAndRecency(enriched);
  }

  const resultTotal = (search || lowStock) ? sorted.length : total;
  const pagedData = lowStock ? sorted.slice(skip, skip + limit) : sorted;

  return {
    data: pagedData,
    total: resultTotal,
    page,
    limit,
    totalPages: resultTotal > 0 ? Math.ceil(resultTotal / limit) : 0,
  };
}

export async function listProductsForOfflineCache(
  pharmacyId: string,
  params: { page?: number; limit?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(params.limit ?? 1000, 1000));
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    pharmacyId,
    isActive: true,
  };

  const [products, total] = await withPrismaRetry(() => Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        pharmacyId: true,
        name: true,
        genericName: true,
        brandName: true,
        sku: true,
        barcode: true,
        dosageForm: true,
        strength: true,
        unitOfMeasure: true,
        drugClass: true,
        description: true,
        reorderLevel: true,
        sellingPrice: true,
        tmda: true,
        tmdaRegistrationNumber: true,
        coldChainRequired: true,
        storageCondition: true,
        retailStock: true,
        wholesaleStock: true,
        wholesaleSellingPrice: true,
        manufacturer: true,
        therapeuticCategory: true,
        drugMasterId: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]));

  // Attach live stock totals so the dispensing screen can filter out zero-stock items
  const productIds = products.map((p) => p.id);
  const stockGroups = productIds.length > 0
    ? await prisma.batch.groupBy({
        by: ['productId'],
        where: { pharmacyId, productId: { in: productIds }, quantityRemaining: { gt: 0 } },
        _sum: { quantityRemaining: true },
        _min: { expiryDate: true },
      })
    : [];
  const stockByProduct = new Map(stockGroups.map((g) => [g.productId, g._sum.quantityRemaining ?? 0]));
  const nextExpiryByProduct = new Map(stockGroups.map((g) => [g.productId, g._min.expiryDate ?? null]));

  const enriched = products.map((p) => ({
    ...p,
    currentStock: stockByProduct.get(p.id) ?? 0,
    nextExpiringBatch: nextExpiryByProduct.get(p.id)
      ? { expiryDate: nextExpiryByProduct.get(p.id)!, quantityRemaining: stockByProduct.get(p.id) ?? 0 }
      : null,
  }));

  return {
    data: enriched,
    total,
    page,
    limit,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

export async function suggestProducts(pharmacyId: string, params: ProductSuggestionParams) {
  const limit = Math.max(1, Math.min(params.limit ?? 10, 25));
  const search = params.search?.trim();
  const barcode = params.barcode?.trim();
  const sku = params.sku?.trim();

  if (!search && !barcode && !sku) {
    return { data: [], total: 0, page: 1, limit, totalPages: 0 };
  }

  const baseWhere: Prisma.ProductWhereInput = {
    pharmacyId,
    isActive: true,
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
  };

  const selectProducts = (where: Prisma.ProductWhereInput, take: number) =>
    prisma.product.findMany({
      where,
      take,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        pharmacyId: true,
        name: true,
        genericName: true,
        brandName: true,
        sku: true,
        barcode: true,
        dosageForm: true,
        strength: true,
        unitOfMeasure: true,
        drugClass: true,
        reorderLevel: true,
        sellingPrice: true,
        tmda: true,
        tmdaRegistrationNumber: true,
        coldChainRequired: true,
        storageCondition: true,
        manufacturer: true,
        therapeuticCategory: true,
        isActive: true,
        drugMasterId: true,
        createdAt: true,
      },
    });

  const candidateLimit = search
    ? search.length === 1
      ? limit
      : search.length === 2
        ? Math.min(Math.max(limit * 2, 24), 30)
        : Math.min(Math.max(limit * 4, 40), 60)
    : limit;
  const products = await withPrismaRetry(async () => {
    if (!search) {
      return selectProducts(baseWhere, candidateLimit);
    }

    const prefixOr: Prisma.ProductWhereInput[] = [
      { name: { startsWith: search, mode: 'insensitive' } },
      { genericName: { startsWith: search, mode: 'insensitive' } },
      { brandName: { startsWith: search, mode: 'insensitive' } },
    ];

    const prefixProducts = await selectProducts({ ...baseWhere, OR: prefixOr }, candidateLimit);
    if (prefixProducts.length >= limit || search.length < 3) {
      return prefixProducts;
    }

    const prefixIds = prefixProducts.map((product) => product.id);
    const containsOr: Prisma.ProductWhereInput[] = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } },
      { brandName: { contains: search, mode: 'insensitive' } },
    ];
    const fallbackProducts = await selectProducts(
      {
        ...baseWhere,
        ...(prefixIds.length > 0 ? { id: { notIn: prefixIds } } : {}),
        OR: containsOr,
      },
      candidateLimit,
    );

    return [...prefixProducts, ...fallbackProducts];
  });

  if (products.length === 0) {
    return { data: [], total: 0, page: 1, limit, totalPages: 0 };
  }

  const stockGroups = await prisma.batch.groupBy({
    by: ['productId'],
    where: {
      pharmacyId,
      productId: { in: products.map((product) => product.id) },
      quantityRemaining: { gt: 0 },
    },
    _sum: { quantityRemaining: true },
  });
  const stockByProduct = new Map(
    stockGroups.map((group) => [group.productId, group._sum.quantityRemaining ?? 0]),
  );
  const withStock = products.map((product) => ({
    ...product,
    currentStock: stockByProduct.get(product.id) ?? 0,
  }));
  const ordered = search ? sortProductsBySuggestionRelevance(withStock, search) : sortProductsByStockAndRecency(withStock);
  const strongMatches = search
    ? ordered.filter((product) => rankProductSuggestion(product, search) < STRONG_SUGGESTION_RANK_CUTOFF)
    : [];
  const collapsed = search
    ? collapseProductSearchResultsInOrder(strongMatches.length > 0 ? strongMatches : ordered)
    : sortProductsByStockAndRecency(withStock);
  const enriched = await enrichProductsWithAwarClass(collapsed.slice(0, limit));

  return {
    data: enriched,
    total: enriched.length,
    page: 1,
    limit,
    totalPages: enriched.length > 0 ? 1 : 0,
  };
}

export async function listUnverifiedProducts(pharmacyId: string, limit = 50) {
  const take = Math.min(Math.max(limit, 1), 100);
  const queueEntries = await prisma.dataReviewQueue.findMany({
    where: {
      pharmacyId,
      entityType: 'PHARMACY_PRODUCT',
      status: {
        in: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'],
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take,
  });

  if (queueEntries.length === 0) {
    return [];
  }

  const productIds = [...new Set(queueEntries.map((entry) => entry.entityId))];
  const products = await prisma.product.findMany({
    where: {
      pharmacyId,
      id: { in: productIds },
    },
    select: {
      id: true,
      name: true,
      genericName: true,
      brandName: true,
      dosageForm: true,
      strength: true,
      manufacturer: true,
      therapeuticCategory: true,
      tmdaRegistrationNumber: true,
      drugMasterId: true,
      createdAt: true,
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));

  return queueEntries
    .map((entry) => {
      const product = productById.get(entry.entityId);
      if (!product) {
        return null;
      }

      return {
        ...product,
        verificationStatus: getProductVerificationStatus(product),
        pendingReview: true,
        reviewQueueStatus: entry.status,
        queueEntryId: entry.id,
        queueNotes: entry.notes,
        queuedAt: entry.createdAt,
      };
    })
    .filter(Boolean);
}

export async function getProduct(id: string, pharmacyId: string) {
  const product = await prisma.product.findFirst({
    where: { id, pharmacyId },
    include: productInclude(),
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const pendingReviewEntry = await prisma.dataReviewQueue.findFirst({
    where: {
      pharmacyId,
      entityType: 'PHARMACY_PRODUCT',
      entityId: product.id,
      status: {
        in: ['DRAFT', 'IMPORTED', 'PENDING_REVIEW'],
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
    },
  });

  const verifiedProduct = {
    ...enrichProductsWithVerification(
      [product],
      new Map(pendingReviewEntry ? [[product.id, { status: pendingReviewEntry.status }]] : []),
    )[0],
    ...product,
    currentStock: product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0),
  };
  const [enrichedProduct] = await enrichProductsWithAwarClass([verifiedProduct]);
  return enrichedProduct;
}

export async function lookupBarcodeForReceiving(pharmacyId: string, userId: string, barcode: string) {
  const normalizedBarcode = normalizeBarcodeInput(barcode);
  if (!normalizedBarcode) {
    throw Object.assign(new Error('Barcode is required'), { status: 400 });
  }

  type BarcodeMappingRow = {
    source: string;
    gs1Payload: Prisma.JsonValue | null;
    id: string;
    name: string;
    genericName: string | null;
    brandName: string | null;
    barcode: string | null;
    dosageForm: string;
    strength: string | null;
    networkConfirmations: number;
  };

  // Tier 1 — own pharmacy mapping (exact match, highest confidence)
  const ownMapping = await prisma.$queryRaw<BarcodeMappingRow[]>(Prisma.sql`
    SELECT
      m."source"                AS "source",
      m."gs1_payload"           AS "gs1Payload",
      m."network_confirmations" AS "networkConfirmations",
      p."id"                    AS "id",
      p."name"                  AS "name",
      p."genericName"           AS "genericName",
      p."brandName"             AS "brandName",
      p."barcode"               AS "barcode",
      p."dosageForm"            AS "dosageForm",
      p."strength"              AS "strength"
    FROM "product_barcode_mappings" m
    INNER JOIN "products" p ON p."id" = m."product_id"
    WHERE m."pharmacy_id" = ${pharmacyId}
      AND m."barcode" = ${normalizedBarcode}
    LIMIT 1
  `);

  if (ownMapping[0]) {
    const m = ownMapping[0];
    await recordBarcodeScanTelemetry(pharmacyId, userId, {
      barcode: normalizedBarcode,
      source: m.source === 'USER_MAP' ? 'USER_MAP' : 'LOCAL',
      result: 'MATCH',
      matchedProductId: m.id,
      metadata: m.gs1Payload as Prisma.InputJsonValue,
    });
    return {
      barcode: normalizedBarcode,
      source: m.source,
      product: {
        id: m.id, name: m.name, genericName: m.genericName,
        brandName: m.brandName, barcode: m.barcode,
        dosageForm: m.dosageForm, strength: m.strength,
      },
      gs1: m.gs1Payload,
      networkSuggestion: false,
    };
  }

  // Tier 2 — own product barcode field
  const localProduct = await prisma.product.findFirst({
    where: { pharmacyId, barcode: normalizedBarcode, isActive: true },
    select: receivingBarcodeProductSelect(),
  });

  if (localProduct) {
    await recordBarcodeScanTelemetry(pharmacyId, userId, {
      barcode: normalizedBarcode,
      source: 'LOCAL',
      result: 'MATCH',
      matchedProductId: localProduct.id,
    });
    return { barcode: normalizedBarcode, source: 'LOCAL', product: localProduct, gs1: null, networkSuggestion: false };
  }

  // Tier 3 — network-shared mapping from any pharmacy (sorted by confirmations desc
  // so the most-confirmed suggestion comes first)
  const networkMapping = await prisma.$queryRaw<BarcodeMappingRow[]>(Prisma.sql`
    SELECT
      m."source"                AS "source",
      m."gs1_payload"           AS "gs1Payload",
      m."network_confirmations" AS "networkConfirmations",
      p."id"                    AS "id",
      p."name"                  AS "name",
      p."genericName"           AS "genericName",
      p."brandName"             AS "brandName",
      p."barcode"               AS "barcode",
      p."dosageForm"            AS "dosageForm",
      p."strength"              AS "strength"
    FROM "product_barcode_mappings" m
    INNER JOIN "products" p ON p."id" = m."product_id"
    WHERE m."shared_to_network" = TRUE
      AND m."barcode" = ${normalizedBarcode}
      AND m."pharmacy_id" != ${pharmacyId}
    ORDER BY m."network_confirmations" DESC
    LIMIT 1
  `);

  if (networkMapping[0]) {
    const m = networkMapping[0];
    // Increment confirmation count on the source mapping asynchronously
    void prisma.$executeRaw(Prisma.sql`
      UPDATE "product_barcode_mappings"
      SET "network_confirmations" = "network_confirmations" + 1,
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "barcode" = ${normalizedBarcode}
        AND "shared_to_network" = TRUE
        AND "pharmacy_id" != ${pharmacyId}
      ORDER BY "network_confirmations" DESC
      LIMIT 1
    `).catch(() => undefined); // non-blocking; telemetry failure must not break the lookup
    await recordBarcodeScanTelemetry(pharmacyId, userId, {
      barcode: normalizedBarcode,
      source: 'NETWORK',
      result: 'MATCH',
      matchedProductId: m.id,
      metadata: m.gs1Payload as Prisma.InputJsonValue,
    });
    return {
      barcode: normalizedBarcode,
      source: 'NETWORK',
      // Return drug-level fields only — not the foreign pharmacy's productId,
      // so the receiving pharmacy must create or match their own product.
      product: {
        id: null, // signal to frontend: no local product yet, show "create product" flow
        name: m.name, genericName: m.genericName,
        brandName: m.brandName, barcode: m.barcode,
        dosageForm: m.dosageForm, strength: m.strength,
      },
      gs1: m.gs1Payload,
      networkSuggestion: true,
      networkConfirmations: m.networkConfirmations,
    };
  }

  // Tier 4 — GS1 barcode parse (structural data, no product)
  const gs1 = parseGs1Barcode(normalizedBarcode);
  if (gs1) {
    await recordBarcodeScanTelemetry(pharmacyId, userId, {
      barcode: normalizedBarcode, source: 'GS1', result: 'MISS',
      metadata: gs1 as Prisma.InputJsonValue,
    });
    return { barcode: normalizedBarcode, source: 'GS1', product: null, gs1, networkSuggestion: false };
  }

  // Tier 5 — complete miss
  await recordBarcodeScanTelemetry(pharmacyId, userId, {
    barcode: normalizedBarcode, source: 'MISS', result: 'MISS',
  });
  return { barcode: normalizedBarcode, source: 'MISS', product: null, gs1: null, networkSuggestion: false };
}

export async function saveProductBarcodeMapping(
  pharmacyId: string,
  userId: string,
  data: {
    barcode: string;
    productId: string;
    source: 'USER_MAP';
    sharedToNetwork?: boolean; // OWNERs and PICs may share to the network catalog
  },
) {
  const normalizedBarcode = normalizeBarcodeInput(data.barcode);
  if (!normalizedBarcode) {
    throw Object.assign(new Error('Barcode is required'), { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      pharmacyId,
      isActive: true,
    },
    select: receivingBarcodeProductSelect(),
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const gs1 = parseGs1Barcode(normalizedBarcode);
  const sharedToNetwork = data.sharedToNetwork ?? false;
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "product_barcode_mappings" (
      "id",
      "pharmacy_id",
      "barcode",
      "product_id",
      "source",
      "gs1_payload",
      "shared_to_network",
      "created_by",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${pharmacyId},
      ${normalizedBarcode},
      ${product.id},
      ${data.source},
      ${gs1 ? (gs1 as Prisma.InputJsonValue) : null},
      ${sharedToNetwork},
      ${userId},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("pharmacy_id", "barcode")
    DO UPDATE SET
      "product_id" = EXCLUDED."product_id",
      "source" = EXCLUDED."source",
      "gs1_payload" = EXCLUDED."gs1_payload",
      "shared_to_network" = EXCLUDED."shared_to_network",
      "updated_at" = CURRENT_TIMESTAMP
  `);

  return {
    barcode: normalizedBarcode,
    source: data.source,
    product,
    gs1,
  };
}

export async function createProduct(pharmacyId: string, data: ProductWriteInput) {
  const resolvedData = await hydrateProductWriteInputFromMaster(data);

  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: toProductData(pharmacyId, resolvedData),
    });

    await syncUnverifiedProductReviewQueue(tx, pharmacyId, product);

    return product;
  }));
}

export async function updateProduct(id: string, pharmacyId: string, data: Partial<ProductWriteInput>) {
  const product = await prisma.product.findFirst({ where: { id, pharmacyId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const resolvedData = await hydrateProductWriteInputFromMaster({
      name: data.name ?? product.name,
      genericName: data.genericName ?? product.genericName ?? undefined,
      brandName: data.brandName ?? product.brandName ?? undefined,
      sku: data.sku ?? product.sku ?? undefined,
      barcode: data.barcode ?? product.barcode ?? undefined,
      dosageForm: data.dosageForm ?? product.dosageForm,
      strength: data.strength ?? product.strength ?? undefined,
      unitOfMeasure: data.unitOfMeasure ?? product.unitOfMeasure,
      drugClass: data.drugClass ?? product.drugClass,
      description: data.description ?? product.description ?? undefined,
      reorderLevel: data.reorderLevel ?? product.reorderLevel,
      sellingPrice: data.sellingPrice ?? (product.sellingPrice != null ? Number(product.sellingPrice) : undefined),
      tmda: data.tmda ?? product.tmda ?? undefined,
      tmdaRegistrationNumber: data.tmdaRegistrationNumber ?? product.tmdaRegistrationNumber ?? undefined,
      coldChainRequired: data.coldChainRequired ?? product.coldChainRequired,
      storageCondition: data.storageCondition ?? product.storageCondition,
      retailStock: data.retailStock ?? product.retailStock,
      wholesaleStock: data.wholesaleStock ?? product.wholesaleStock,
      wholesaleSellingPrice:
        data.wholesaleSellingPrice ??
        (product.wholesaleSellingPrice != null ? Number(product.wholesaleSellingPrice) : undefined),
      manufacturer: data.manufacturer ?? product.manufacturer ?? undefined,
      therapeuticCategory: data.therapeuticCategory ?? product.therapeuticCategory ?? undefined,
      drugMasterId: data.drugMasterId ?? product.drugMasterId ?? undefined,
      lastSupplierId: data.lastSupplierId ?? product.lastSupplierId ?? undefined,
  });

  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id },
      data: toProductData(pharmacyId, {
        name: resolvedData.name,
        genericName: resolvedData.genericName,
        brandName: resolvedData.brandName,
        sku: resolvedData.sku,
        barcode: resolvedData.barcode,
        dosageForm: resolvedData.dosageForm,
        strength: resolvedData.strength,
        unitOfMeasure: resolvedData.unitOfMeasure,
        drugClass: resolvedData.drugClass,
        description: resolvedData.description,
        reorderLevel: resolvedData.reorderLevel,
        sellingPrice: resolvedData.sellingPrice,
        tmda: resolvedData.tmda,
        tmdaRegistrationNumber: resolvedData.tmdaRegistrationNumber,
        coldChainRequired: resolvedData.coldChainRequired,
        storageCondition: resolvedData.storageCondition,
        retailStock: resolvedData.retailStock,
        wholesaleStock: resolvedData.wholesaleStock,
        wholesaleSellingPrice: resolvedData.wholesaleSellingPrice,
        manufacturer: resolvedData.manufacturer,
        therapeuticCategory: resolvedData.therapeuticCategory,
        drugMasterId: resolvedData.drugMasterId,
        lastSupplierId: resolvedData.lastSupplierId,
      }),
    });

    await syncUnverifiedProductReviewQueue(tx, pharmacyId, updatedProduct);

    return updatedProduct;
  }));
}

export async function fefoQuery(pharmacyId: string, productId: string, quantityRequired = 1) {
  const batches = await prisma.batch.findMany({
    where: {
      pharmacyId,
      productId,
      quantityRemaining: { gt: 0 },
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          genericName: true,
        },
      },
    },
  });

  return batches.map((batch, index) => ({
    ...batch,
    fefoRank: index + 1,
    satisfiesQuantity: batch.quantityRemaining >= quantityRequired,
  }));
}

export async function resolveFefoBatch(pharmacyId: string, productId: string, quantityRequired = 1) {
  const batches = await fefoQuery(pharmacyId, productId, quantityRequired);
  const batch = batches.find((entry) => entry.satisfiesQuantity);

  if (!batch) {
    throw Object.assign(new Error('No FEFO batch has enough stock for this request'), { status: 409 });
  }

  return batch;
}

export async function listBatches(
  pharmacyId: string,
  params: { productId?: string; expiringDays?: number; page?: number; limit?: number },
) {
  const { productId, expiringDays, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BatchWhereInput = {
    pharmacyId,
    quantityRemaining: { gt: 0 },
    ...(productId ? { productId } : {}),
    ...(expiringDays
      ? {
          expiryDate: { lte: new Date(Date.now() + expiringDays * 86400000) },
        }
      : {}),
  };

  const [batches, total] = await withPrismaRetry(() => Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      include: { product: true, supplier: true },
    }),
    prisma.batch.count({ where }),
  ]));

  return { data: batches, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function receiveBatch(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantityRemaining: number;
    purchasePrice: number;
    sellingPrice?: number;
    supplierId?: string;
    localTimestamp?: string;
  },
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const supplierId = data.supplierId?.trim() || undefined;

    const product = await tx.product.findFirst({
      where: { id: data.productId, pharmacyId },
      select: { id: true },
    });
    if (!product) {
      throw Object.assign(new Error('Product not found'), { status: 404, code: 'PRODUCT_NOT_FOUND' });
    }

    if (supplierId) {
      const supplier = await tx.supplier.findFirst({
        where: {
          id: supplierId,
          pharmacyId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!supplier) {
        throw Object.assign(new Error('Selected supplier is no longer available for this pharmacy'), {
          status: 400,
          code: 'SUPPLIER_NOT_FOUND',
        });
      }
    }

    if (data.sellingPrice || supplierId) {
      await tx.product.update({
        where: { id: data.productId },
        data: {
          ...(data.sellingPrice ? { sellingPrice: data.sellingPrice } : {}),
          ...(supplierId ? { lastSupplierId: supplierId } : {}),
        },
      });
    }

    const batch = await tx.batch.create({
      data: {
        productId: data.productId,
        pharmacyId,
        batchNumber: data.batchNumber,
        expiryDate: new Date(data.expiryDate),
        quantityRemaining: data.quantityRemaining,
        purchasePrice: data.purchasePrice,
        supplierId,
      },
    });

    await tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: batch.id,
        userId,
        type: 'RECEIVED',
        quantity: data.quantityRemaining,
        notes: 'Stock intake',
        localCreatedAt: clampLocalTimestamp(data.localTimestamp),
        syncedAt: new Date(),
      },
    });

    return batch;
  }));
}

export async function listMovements(
  pharmacyId: string,
  params: {
    productId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
) {
  const { productId, type, dateFrom, dateTo, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    pharmacyId,
    ...(productId ? { productId } : {}),
    ...(type ? { type: type as any } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, genericName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data: movements, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adjustStock(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchId?: string;
    type: 'ADJUSTED' | 'DAMAGED' | 'EXPIRED_REMOVED' | 'RETURNED';
    quantity: number;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    let targetBatchId = data.batchId;

    if (!targetBatchId) {
      const fefoBatch = await resolveFefoBatch(pharmacyId, data.productId, data.quantity);
      targetBatchId = fefoBatch.id;
    }

    const batch = await tx.batch.findFirst({
      where: { id: targetBatchId, pharmacyId },
    });
    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    const delta = data.type === 'RETURNED' ? data.quantity : -data.quantity;
    await tx.batch.update({
      where: { id: batch.id },
      data: { quantityRemaining: { increment: delta } },
    });

    return tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: batch.id,
        userId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
      },
    });
  });
}

export async function listEnterpriseOutlets(pharmacyId: string, userId: string, allowAllDestinations = false) {
  const now = new Date();

  const select = {
    id: true,
    name: true,
    licenceNumber: true,
    region: true,
    pharmacyType: true,
    subscriptionTier: true,
    status: true,
  } as const;

  if (allowAllDestinations) {
    const outlets = await withPrismaRetry(() => prisma.pharmacy.findMany({
      where: {
        id: { not: pharmacyId },
        isActive: true,
        subscriptionTier: 'ENTERPRISE',
      },
      select,
      orderBy: [{ name: 'asc' }],
    }));

    return {
      enabled: true,
      outlets,
    };
  }

  const memberships = await withPrismaRetry(() => prisma.pharmacyMembership.findMany({
    where: {
      userId,
      active: true,
      OR: [
        { validFrom: null },
        { validFrom: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
      ],
      pharmacy: {
        id: { not: pharmacyId },
        isActive: true,
        subscriptionTier: 'ENTERPRISE',
      },
    },
    select: {
      role: true,
      pharmacy: { select },
    },
    orderBy: [{ pharmacy: { name: 'asc' } }],
  }));

  return {
    enabled: true,
    outlets: memberships.map((membership) => ({
      ...membership.pharmacy,
      role: membership.role,
    })),
  };
}

export async function transferStockBetweenOutlets(
  pharmacyId: string,
  userId: string,
  allowAnyDestination: boolean,
  data: EnterpriseTransferInput,
) {
  if (data.destinationPharmacyId === pharmacyId) {
    throw Object.assign(new Error('Destination outlet must be different from the source outlet'), {
      status: 400,
      code: 'SAME_OUTLET_TRANSFER',
    });
  }

  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const now = new Date();

    const destination = await tx.pharmacy.findFirst({
      where: {
        id: data.destinationPharmacyId,
        isActive: true,
        subscriptionTier: 'ENTERPRISE',
      },
      select: {
        id: true,
        name: true,
        licenceNumber: true,
        region: true,
        subscriptionTier: true,
      },
    });

    if (!destination) {
      throw Object.assign(new Error('Destination enterprise outlet not found'), {
        status: 404,
        code: 'DESTINATION_OUTLET_NOT_FOUND',
      });
    }

    if (!allowAnyDestination) {
      const membership = await tx.pharmacyMembership.findFirst({
        where: {
          userId,
          pharmacyId: data.destinationPharmacyId,
          active: true,
          OR: [
            { validFrom: null },
            { validFrom: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { validUntil: null },
                { validUntil: { gte: now } },
              ],
            },
          ],
        },
        select: { id: true },
      });

      if (!membership) {
        throw Object.assign(new Error('User is not a member of the destination outlet'), {
          status: 403,
          code: 'DESTINATION_MEMBERSHIP_REQUIRED',
        });
      }
    }

    const sourceBatch = await tx.batch.findFirst({
      where: data.batchId
        ? {
            id: data.batchId,
            pharmacyId,
            productId: data.productId,
          }
        : {
            pharmacyId,
            productId: data.productId,
            quantityRemaining: { gte: data.quantity },
          },
      include: {
        product: true,
      },
      orderBy: data.batchId ? undefined : [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    if (!sourceBatch || !sourceBatch.product.isActive) {
      throw Object.assign(new Error('Source product batch not found'), {
        status: 404,
        code: 'SOURCE_BATCH_NOT_FOUND',
      });
    }

    if (sourceBatch.quantityRemaining < data.quantity) {
      throw Object.assign(new Error('Source batch does not have enough stock for this transfer'), {
        status: 409,
        code: 'INSUFFICIENT_SOURCE_STOCK',
      });
    }

    const decrement = await tx.batch.updateMany({
      where: {
        id: sourceBatch.id,
        pharmacyId,
        quantityRemaining: { gte: data.quantity },
      },
      data: {
        quantityRemaining: { decrement: data.quantity },
      },
    });

    if (decrement.count !== 1) {
      throw Object.assign(new Error('Source stock changed while creating the transfer'), {
        status: 409,
        code: 'SOURCE_STOCK_CHANGED',
      });
    }

    const destinationProductResult = await resolveDestinationProductForTransfer(
      tx,
      data.destinationPharmacyId,
      data.destinationProductId,
      sourceBatch.product,
    );

    const destinationBatch = await tx.batch.create({
      data: {
        productId: destinationProductResult.product.id,
        pharmacyId: data.destinationPharmacyId,
        batchNumber: sourceBatch.batchNumber,
        expiryDate: sourceBatch.expiryDate,
        quantityRemaining: data.quantity,
        purchasePrice: sourceBatch.purchasePrice,
      },
    });

    const trimmedNote = data.notes?.trim();
    const sourceNote = [
      `Transfer to ${destination.name}`,
      destination.licenceNumber ? `licence ${destination.licenceNumber}` : null,
      trimmedNote || null,
    ].filter(Boolean).join(' - ');

    const destinationNote = [
      `Transfer from source outlet`,
      trimmedNote || null,
    ].filter(Boolean).join(' - ');

    const sourceMovement = await tx.stockMovement.create({
      data: {
        pharmacyId,
        productId: data.productId,
        batchId: sourceBatch.id,
        userId,
        type: 'TRANSFERRED',
        quantity: data.quantity,
        notes: sourceNote,
        localCreatedAt: now,
        syncedAt: now,
      },
    });
    const destinationMovement = await tx.stockMovement.create({
      data: {
        pharmacyId: data.destinationPharmacyId,
        productId: destinationProductResult.product.id,
        batchId: destinationBatch.id,
        userId,
        type: 'TRANSFERRED',
        quantity: data.quantity,
        notes: destinationNote,
        localCreatedAt: now,
        syncedAt: now,
      },
    });

    return {
      quantity: data.quantity,
      source: {
        pharmacyId,
        productId: data.productId,
        batchId: sourceBatch.id,
        movementId: sourceMovement.id,
        remainingQuantity: sourceBatch.quantityRemaining - data.quantity,
      },
      destination: {
        pharmacyId: data.destinationPharmacyId,
        pharmacyName: destination.name,
        productId: destinationProductResult.product.id,
        productCreated: destinationProductResult.created,
        batchId: destinationBatch.id,
        movementId: destinationMovement.id,
      },
    };
  }));
}

function toApprovedSuggestionMovementType(reason: string, quantityDelta: number): 'ADJUSTED' | 'DAMAGED' | 'EXPIRED_REMOVED' | 'RETURNED' {
  if (quantityDelta > 0) {
    return 'ADJUSTED';
  }

  switch (reason) {
    case 'DAMAGED':
      return 'DAMAGED';
    case 'EXPIRED':
      return 'EXPIRED_REMOVED';
    case 'RETURN_TO_SUPPLIER':
      return 'RETURNED';
    default:
      return 'ADJUSTED';
  }
}

async function resolveSuggestionBatch(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  suggestion: {
    batchId: string | null;
    productId: string;
  },
  approvedQuantityDelta: number,
) {
  if (suggestion.batchId) {
    const batch = await tx.batch.findFirst({
      where: {
        id: suggestion.batchId,
        pharmacyId,
        productId: suggestion.productId,
      },
    });

    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }

    return batch;
  }

  if (approvedQuantityDelta < 0) {
    const batch = await tx.batch.findFirst({
      where: {
        pharmacyId,
        productId: suggestion.productId,
        quantityRemaining: { gte: Math.abs(approvedQuantityDelta) },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    });

    if (!batch) {
      throw Object.assign(new Error('No FEFO batch has enough stock for this approval'), { status: 409 });
    }

    return batch;
  }

  const batch = await tx.batch.findFirst({
    where: {
      pharmacyId,
      productId: suggestion.productId,
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
  });

  if (!batch) {
    throw Object.assign(new Error('Batch is required before approving a positive stock correction'), { status: 409 });
  }

  return batch;
}

function buildApprovedSuggestionNotes(
  suggestion: {
    id: string;
    reason: string;
    note: string | null;
  },
  reviewNote: string | undefined,
) {
  return [
    `Approved from suggestion ${suggestion.id}`,
    `reason=${suggestion.reason}`,
    suggestion.note?.trim() || null,
    reviewNote?.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ');
}

async function recordBarcodeScanTelemetry(
  pharmacyId: string,
  userId: string,
  data: {
    barcode: string;
    source: 'LOCAL' | 'GS1' | 'USER_MAP' | 'MISS' | 'NETWORK';
    result: 'MATCH' | 'MISS';
    matchedProductId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "barcode_scan_telemetry" (
      "id",
      "pharmacy_id",
      "barcode",
      "source",
      "result",
      "matched_product_id",
      "metadata",
      "created_by",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${randomUUID()},
      ${pharmacyId},
      ${data.barcode},
      ${data.source},
      ${data.result},
      ${data.matchedProductId ?? null},
      ${data.metadata ?? null},
      ${userId},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `);
}

async function storeStockAdjustmentSuggestionPhoto(photo: StockAdjustmentSuggestionPhoto) {
  const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const suggestionDir = path.join(uploadsRoot, 'stock-adjustment-suggestions');
  await mkdir(suggestionDir, { recursive: true });

  const extension = path.extname(photo.originalname || '').toLowerCase();
  const safeExtension = extension && extension.length <= 10 ? extension : '.jpg';
  const filename = `${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(suggestionDir, filename);
  await writeFile(absolutePath, photo.buffer);

  return path.join('uploads', 'stock-adjustment-suggestions', filename).replace(/\\/g, '/');
}

export async function createStockAdjustmentSuggestion(
  pharmacyId: string,
  userId: string,
  data: {
    productId: string;
    batchId?: string;
    quantityDelta: number;
    reason: string;
    note?: string;
    photo?: StockAdjustmentSuggestionPhoto;
  },
) {
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      pharmacyId,
    },
    select: {
      id: true,
      name: true,
      genericName: true,
    },
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  if (data.batchId) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: data.batchId,
        pharmacyId,
        productId: data.productId,
      },
      select: { id: true },
    });

    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { status: 404 });
    }
  }

  const photoPath = data.photo ? await storeStockAdjustmentSuggestionPhoto(data.photo) : undefined;

  return prisma.stockAdjustmentSuggestion.create({
    data: {
      pharmacyId,
      productId: data.productId,
      batchId: data.batchId,
      quantityDelta: data.quantityDelta,
      reason: data.reason,
      note: data.note,
      photoPath,
      createdBy: userId,
    },
    include: stockAdjustmentSuggestionInclude(),
  });
}

export async function listStockAdjustmentSuggestions(
  pharmacyId: string,
  params: { status?: string; limit?: number } = {},
) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  return prisma.stockAdjustmentSuggestion.findMany({
    where: {
      pharmacyId,
      ...(params.status ? { status: params.status } : {}),
    },
    include: stockAdjustmentSuggestionInclude(),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
}

export async function reviewStockAdjustmentSuggestion(
  pharmacyId: string,
  reviewerUserId: string,
  suggestionId: string,
  data: {
    status: SuggestionReviewStatus;
    approvedQuantityDelta?: number;
    reviewNote?: string;
  },
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const suggestion = await tx.stockAdjustmentSuggestion.findFirst({
      where: {
        id: suggestionId,
        pharmacyId,
      },
    });

    if (!suggestion) {
      throw Object.assign(new Error('Stock adjustment suggestion not found'), { status: 404 });
    }

    if (suggestion.status !== 'PENDING') {
      throw Object.assign(new Error('Stock adjustment suggestion has already been reviewed'), { status: 409 });
    }

    let approvedQuantityDelta: number | null = null;
    if (data.status === 'APPROVED') {
      approvedQuantityDelta = data.approvedQuantityDelta ?? suggestion.quantityDelta;
    }

    if (data.status === 'PARTIAL') {
      approvedQuantityDelta = data.approvedQuantityDelta ?? null;
      if (!approvedQuantityDelta || approvedQuantityDelta === 0) {
        throw Object.assign(new Error('Approved quantity delta is required for partial review'), { status: 400 });
      }

      const requestedDirection = Math.sign(suggestion.quantityDelta);
      if (Math.sign(approvedQuantityDelta) !== requestedDirection) {
        throw Object.assign(new Error('Approved quantity delta must keep the same direction as the request'), { status: 400 });
      }

      if (Math.abs(approvedQuantityDelta) >= Math.abs(suggestion.quantityDelta)) {
        throw Object.assign(new Error('Partial quantity delta must be smaller than the requested quantity delta'), { status: 400 });
      }
    }

    if (data.status === 'APPROVED' && approvedQuantityDelta !== null && Math.sign(approvedQuantityDelta) !== Math.sign(suggestion.quantityDelta)) {
      throw Object.assign(new Error('Approved quantity delta must keep the same direction as the request'), { status: 400 });
    }

    if (approvedQuantityDelta !== null) {
      const batch = await resolveSuggestionBatch(tx, pharmacyId, suggestion, approvedQuantityDelta);
      const nextQuantity = batch.quantityRemaining + approvedQuantityDelta;

      if (nextQuantity < 0) {
        throw Object.assign(new Error('Approved quantity delta exceeds batch stock'), { status: 409 });
      }

      await tx.batch.update({
        where: { id: batch.id },
        data: { quantityRemaining: { increment: approvedQuantityDelta } },
      });

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: suggestion.productId,
          batchId: batch.id,
          userId: reviewerUserId,
          type: toApprovedSuggestionMovementType(suggestion.reason, approvedQuantityDelta),
          quantity: Math.abs(approvedQuantityDelta),
          notes: buildApprovedSuggestionNotes(suggestion, data.reviewNote),
        },
      });
    }

    await tx.stockAdjustmentSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: data.status,
        approvedQuantityDelta,
        reviewNote: data.reviewNote?.trim() || null,
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    return tx.stockAdjustmentSuggestion.findUniqueOrThrow({
      where: { id: suggestion.id },
      include: stockAdjustmentSuggestionInclude(),
    });
  }));
}

export async function listSuppliers(pharmacyId: string) {
  return prisma.supplier.findMany({
    where: { pharmacyId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createSupplier(pharmacyId: string, data: SupplierWriteInput) {
  return prisma.supplier.create({
    data: {
      pharmacyId,
      name: data.name.trim(),
      contactName: data.contactName?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      address: data.address?.trim() || undefined,
    },
  });
}

export async function updateSupplier(pharmacyId: string, supplierId: string, data: SupplierWriteInput) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, pharmacyId },
  });
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name.trim(),
      contactName: data.contactName?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
    },
  });
}

export async function deactivateSupplier(pharmacyId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, pharmacyId },
  });
  if (!supplier) {
    throw Object.assign(new Error('Supplier not found'), { status: 404 });
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: { isActive: false },
  });
}

export async function stockOnHand(pharmacyId: string) {
  const products = await prisma.product.findMany({
    where: { pharmacyId, isActive: true },
    include: productInclude(),
    orderBy: { name: 'asc' },
  });

  return products.map((product) => {
    const currentStock = product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
    return {
      ...product,
      currentStock,
      nextExpiringBatch: product.batches[0] ?? null,
    };
  });
}

export async function dashboardSummary(
  pharmacyId: string,
  params: {
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const now = Date.now();
  const expiryCutoff = new Date(now + 30 * 86400000);
  const todayStart = params.dateFrom ? new Date(params.dateFrom) : new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = params.dateTo ? new Date(params.dateTo) : new Date(new Date().setHours(23, 59, 59, 999));

  type LowStockRow = {
    id: string;
    name: string;
    genericName: string | null;
    brandName: string | null;
    barcode: string | null;
    dosageForm: string;
    strength: string | null;
    reorderLevel: number;
    currentStock: number | bigint;
  };
  type CountRow = { count: number | bigint };
  type RevenueRow = { totalRevenue: string | number | null };
  type DailyRevenueRow = { day: string | Date; revenue: string | number | null };

  const sevenDayStart = new Date(todayStart);
  sevenDayStart.setDate(sevenDayStart.getDate() - 6);

  const [
    totalProducts,
    lowStockProductsRaw,
    lowStockCountRows,
    expiryBatches,
    expiryCount,
    recentMovements,
    todayGroups,
    todayRevenueRows,
    dailyRevenueRows,
  ] = await Promise.all([
    prisma.product.count({ where: { pharmacyId, isActive: true } }),
    prisma.$queryRaw<LowStockRow[]>`
      SELECT
        p."id",
        p."name",
        p."genericName",
        p."brandName",
        p."barcode",
        CAST(p."dosageForm" AS TEXT) AS "dosageForm",
        p."strength",
        p."reorderLevel",
        COALESCE(SUM(b."quantityRemaining"), 0)::int AS "currentStock"
      FROM "products" p
      LEFT JOIN "batches" b
        ON b."productId" = p."id"
        AND b."pharmacyId" = p."pharmacyId"
        AND b."quantityRemaining" > 0
      WHERE p."pharmacyId" = ${pharmacyId}
        AND p."isActive" = true
        AND (
          NULLIF(TRIM(p."genericName"), '') IS NOT NULL
          OR NULLIF(TRIM(p."brandName"), '') IS NOT NULL
          OR p."drug_product_id" IS NOT NULL
        )
      GROUP BY
        p."id",
        p."name",
        p."genericName",
        p."brandName",
        p."barcode",
        p."dosageForm",
        p."strength",
        p."reorderLevel"
      HAVING COALESCE(SUM(b."quantityRemaining"), 0) < p."reorderLevel"
      ORDER BY
        (COALESCE(SUM(b."quantityRemaining"), 0)::float / GREATEST(p."reorderLevel", 1)) ASC,
        p."name" ASC
      LIMIT 6
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM (
        SELECT p."id"
        FROM "products" p
        LEFT JOIN "batches" b
          ON b."productId" = p."id"
          AND b."pharmacyId" = p."pharmacyId"
          AND b."quantityRemaining" > 0
        WHERE p."pharmacyId" = ${pharmacyId}
          AND p."isActive" = true
          AND (
            NULLIF(TRIM(p."genericName"), '') IS NOT NULL
            OR NULLIF(TRIM(p."brandName"), '') IS NOT NULL
            OR p."drug_product_id" IS NOT NULL
          )
        GROUP BY p."id", p."reorderLevel"
        HAVING COALESCE(SUM(b."quantityRemaining"), 0) < p."reorderLevel"
      ) low_stock
    `,
    prisma.batch.findMany({
      where: {
        pharmacyId,
        quantityRemaining: { gt: 0 },
        expiryDate: { lte: expiryCutoff },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            coldChainRequired: true,
          },
        },
      },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      take: 6,
    }),
    prisma.batch.count({
      where: {
        pharmacyId,
        quantityRemaining: { gt: 0 },
        expiryDate: { lte: expiryCutoff },
      },
    }),
    prisma.stockMovement.findMany({
      where: { pharmacyId },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, genericName: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      },
    }),
    prisma.stockMovement.groupBy({
      by: ['type'],
      where: {
        pharmacyId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.$queryRaw<RevenueRow[]>`
      SELECT COALESCE(SUM("total_amount"), 0)::text AS "totalRevenue"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND "created_at" >= ${todayStart}
        AND "created_at" <= ${todayEnd}
    `,
    prisma.$queryRaw<DailyRevenueRow[]>`
      SELECT
        DATE_TRUNC('day', "created_at")::date AS "day",
        COALESCE(SUM("total_amount"), 0)::text AS "revenue"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND "created_at" >= ${sevenDayStart}
        AND "created_at" <= ${todayEnd}
      GROUP BY DATE_TRUNC('day', "created_at")::date
      ORDER BY "day" ASC
    `,
  ]);

  const lowStockProducts = lowStockProductsRaw.map((product) => ({
    ...product,
    currentStock: Number(product.currentStock),
  }));
  const lowStockCount = Number(lowStockCountRows[0]?.count ?? 0);

  const todayByType = new Map<MovementType, { quantity: number; count: number }>(
    todayGroups.map((group) => [
      group.type,
      {
        quantity: group._sum.quantity ?? 0,
        count: group._count._all,
      },
    ]),
  );
  const todayAdjustments = (['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED'] as MovementType[])
    .reduce((sum, type) => sum + (todayByType.get(type)?.count ?? 0), 0);
  const dailyRevenueByDate = new Map(
    dailyRevenueRows.map((row) => [
      row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
      Number(row.revenue ?? 0),
    ]),
  );
  const revenueLast7Days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sevenDayStart);
    day.setDate(sevenDayStart.getDate() + index);
    const key = day.toISOString().slice(0, 10);

    return {
      date: key,
      revenue: dailyRevenueByDate.get(key) ?? 0,
    };
  });

  return {
    totalProducts,
    lowStockCount,
    lowStockProducts,
    expiryCount,
    expiryBatches,
    recentMovements,
    today: {
      dispensed: todayByType.get('DISPENSED')?.quantity ?? 0,
      received: todayByType.get('RECEIVED')?.quantity ?? 0,
      adjustments: todayAdjustments,
      events: todayGroups.reduce((sum, group) => sum + group._count._all, 0),
      revenue: Number(todayRevenueRows[0]?.totalRevenue ?? 0),
      revenueLast7Days,
    },
  };
}

export async function expiryReport(pharmacyId: string, days = 30) {
  return prisma.batch.findMany({
    where: {
      pharmacyId,
      quantityRemaining: { gt: 0 },
      expiryDate: { lte: new Date(Date.now() + days * 86400000) },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          genericName: true,
          coldChainRequired: true,
        },
      },
    },
    orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
    take: 500,
  });
}

export async function lowStockReport(pharmacyId: string) {
  const products = await stockOnHand(pharmacyId);
  return products
    .filter((product) => (product.currentStock ?? 0) <= product.reorderLevel)
    .map((product) => ({
      ...product,
      shortage: Math.max(product.reorderLevel - (product.currentStock ?? 0), 0),
    }))
    .sort((a, b) => (a.currentStock ?? 0) - (b.currentStock ?? 0));
}

export async function listSyncConflicts(pharmacyId: string, status?: SyncConflictStatus) {
  return prisma.syncConflict.findMany({
    where: {
      pharmacyId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function createSyncConflict(
  pharmacyId: string,
  payload: {
    entityType: string;
    entityId: string;
    conflictType: string;
    localPayload?: Prisma.InputJsonValue;
    serverPayload?: Prisma.InputJsonValue;
  },
) {
  return prisma.syncConflict.create({
    data: {
      pharmacyId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      conflictType: payload.conflictType,
      localPayload: payload.localPayload ?? {},
      serverPayload: payload.serverPayload ?? {},
    },
  });
}

export async function resolveSyncConflict(pharmacyId: string, conflictId: string, userId: string) {
  const conflict = await prisma.syncConflict.findFirst({
    where: { id: conflictId, pharmacyId },
  });
  if (!conflict) {
    throw Object.assign(new Error('Conflict not found'), { status: 404 });
  }

  return prisma.syncConflict.update({
    where: { id: conflictId },
    data: {
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
  });
}

export async function importProductsFromCsv(pharmacyId: string, csv: string): Promise<CsvImportResult> {
  const rows = parseCsv(csv);
  const errors: CsvImportResult['errors'] = [];

  if (rows.length === 0) {
    return {
      inserted: 0,
      errors: [{ row: 0, field: 'csv', message: 'CSV must contain a header row and at least one data row' }],
    };
  }

  const normalizedRows = rows.map((row, index) => {
    const name = row.name?.trim();
    if (!name) {
      errors.push({ row: index + 2, field: 'name', message: 'Name is required' });
    }

    const reorderLevel = parseNumber(row.reorderLevel);
    if (row.reorderLevel && reorderLevel === undefined) {
      errors.push({ row: index + 2, field: 'reorderLevel', message: 'Reorder level must be numeric' });
    }

    const sellingPrice = parseNumber(row.sellingPrice);
    if (row.sellingPrice && sellingPrice === undefined) {
      errors.push({ row: index + 2, field: 'sellingPrice', message: 'Selling price must be numeric' });
    }

    const wholesaleSellingPrice = parseNumber(row.wholesaleSellingPrice);
    if (row.wholesaleSellingPrice && wholesaleSellingPrice === undefined) {
      errors.push({ row: index + 2, field: 'wholesaleSellingPrice', message: 'Wholesale selling price must be numeric' });
    }

    return {
      name: name ?? '',
      genericName: row.genericName,
      brandName: row.brandName,
      sku: row.sku,
      barcode: row.barcode,
      dosageForm: row.dosageForm,
      strength: row.strength,
      unitOfMeasure: row.unitOfMeasure,
      drugClass: row.drugClass,
      description: row.description,
      reorderLevel,
      sellingPrice,
      tmda: row.tmda,
      tmdaRegistrationNumber: row.tmdaRegistrationNumber,
      coldChainRequired: parseBoolean(row.coldChainRequired, false),
      storageCondition: row.storageCondition || 'AMBIENT',
      retailStock: parseBoolean(row.retailStock, true),
      wholesaleStock: parseBoolean(row.wholesaleStock, false),
      wholesaleSellingPrice,
      manufacturer: row.manufacturer,
      therapeuticCategory: row.therapeuticCategory,
    };
  });

  if (errors.length > 0) {
    return { inserted: 0, errors };
  }

  await prisma.$transaction(
    normalizedRows.map((row) =>
      prisma.product.create({
        data: toProductData(pharmacyId, row),
      }),
    ),
  );

  return { inserted: normalizedRows.length, errors: [] };
}

export async function searchDrugMaster(params: {
  query?: string;
  limit?: number;
  page?: number;
  storageCondition?: string;
  essentialOnly?: boolean;
}) {
  const {
    query = '',
    limit = 20,
    page = 1,
    storageCondition,
    essentialOnly = false,
  } = params;
  const take = Math.max(1, Math.min(limit, 100));
  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * take;
  const trimmedQuery = query.trim();
  const textFilter = trimmedQuery.length < 3
    ? { startsWith: trimmedQuery, mode: 'insensitive' as const }
    : { contains: trimmedQuery, mode: 'insensitive' as const };

  const where: Prisma.DrugProductWhereInput = {
    isActive: true,
    ...(storageCondition ? { storageCondition } : {}),
    ...(essentialOnly ? { isEssentialMedicine: true } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { genericName: textFilter },
            { productName: textFilter },
            { tmdaRegistrationNumber: textFilter },
            { brand: { is: { name: textFilter } } },
            { manufacturer: { is: { name: textFilter } } },
            {
              aliases: {
                some: {
                  normalizedAlias: {
                    contains: trimmedQuery.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const rowQuery = prisma.drugProduct.findMany({
    where,
    skip,
    take,
    orderBy: [{ genericName: 'asc' }, { productName: 'asc' }],
    include: {
      brand: { select: { name: true } },
      manufacturer: { select: { name: true } },
      dosageForm: { select: { name: true } },
      packSize: { select: { quantity: true, unit: true } },
      therapeuticClass: { select: { name: true } },
    },
  });

  const [rows, total] = trimmedQuery
    ? [await rowQuery, undefined]
    : await prisma.$transaction([
      prisma.drugProduct.findMany({
      where,
      skip,
      take,
      orderBy: [{ genericName: 'asc' }, { productName: 'asc' }],
      include: {
        brand: { select: { name: true } },
        manufacturer: { select: { name: true } },
        dosageForm: { select: { name: true } },
        packSize: { select: { quantity: true, unit: true } },
        therapeuticClass: { select: { name: true } },
      },
    }),
    prisma.drugProduct.count({ where }),
  ]);
  const resolvedTotal = total ?? rows.length;

  return {
    data: rows.map((row) => ({
      id: row.id,
      productName: row.productName,
      tmdaRegistrationNumber: row.tmdaRegistrationNumber ?? '',
      genericName: row.genericName ?? row.productName,
      brandName: row.brand?.name ?? null,
      manufacturer: row.manufacturer?.name ?? null,
      drugClass: null,
      dosageForm: row.dosageForm?.name ?? row.dosageFormName ?? null,
      strength: row.strengthText ?? null,
      unitOfMeasure: row.packSize?.unit ?? 'unit',
      packSize: row.packSize?.quantity ? Number(row.packSize.quantity) : 1,
      storageCondition: row.storageCondition as 'AMBIENT' | 'REFRIGERATED' | 'FROZEN',
      isColdChain: row.isColdChain,
      isEssentialMedicine: row.isEssentialMedicine,
      therapeuticCategory: row.therapeuticClass?.name ?? row.category ?? null,
      verificationStatus: row.registrationStatus,
    })),
    meta: {
      total: resolvedTotal,
      page: currentPage,
      limit: take,
      totalPages: resolvedTotal === 0 ? 0 : Math.ceil(resolvedTotal / take),
    },
  };
}

export async function alertAlreadySentToday(
  pharmacyId: string,
  referenceId: string,
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'WHATSAPP',
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return prisma.alertLog.findFirst({
    where: {
      pharmacyId,
      referenceId,
      channel,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });
}
