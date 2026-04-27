import 'dotenv/config';
import { AliasType, Prisma, PrismaClient } from '@prisma/client';

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

function stripStrengthAndForm(value: string) {
  return clean(
    value
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|i\.u|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mg|g))?\b/gi, ' ')
      .replace(/\b(?:film coated|dispersible|hard gelatin|solid oral)\b/gi, ' ')
      .replace(/\b(?:tablets?|capsules?|injections?|syrups?|creams?|ointments?|drops|gel|solution|suspension|powder for injection|powder for suspension)\b/gi, ' '),
  );
}

function deriveBrandName(productName: string, genericName: string | null) {
  const genericTokens = normalizeText(genericName).split(' ').filter((token) => token.length >= 4);
  const firstGenericToken = genericTokens.find((token) => normalizeText(productName).includes(token));
  if (firstGenericToken) {
    const productWords = productName.split(/\s+/);
    const genericIndex = productWords.findIndex((word) => normalizeText(word).includes(firstGenericToken));
    if (genericIndex > 0) {
      const prefixBrand = stripStrengthAndForm(productWords.slice(0, genericIndex).join(' '));
      if (prefixBrand.length >= 2 && prefixBrand.length <= 80) {
        return prefixBrand;
      }
    }
  }

  const withoutStrength = stripStrengthAndForm(productName);
  const normalizedProduct = normalizeText(withoutStrength);
  const normalizedGeneric = normalizeText(genericName);

  if (!normalizedProduct || normalizedProduct === normalizedGeneric || normalizedProduct.includes(normalizedGeneric)) {
    return null;
  }

  return withoutStrength.length >= 2 && withoutStrength.length <= 80 ? withoutStrength : null;
}

async function createManyInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    await insert(rows.slice(index, index + size));
  }
}

async function runUpdatesInChunks(updates: Array<() => Prisma.PrismaPromise<unknown>>, size = 50) {
  for (let index = 0; index < updates.length; index += size) {
    await prisma.$transaction(updates.slice(index, index + size).map((update) => update()));
  }
}

async function main() {
  const products = await prisma.drugProduct.findMany({
    where: {
      registrationStatus: {
        in: [
          'TMDA_PRODUCT_INFO_LISTED',
          'MANUFACTURER_LIST_UNVERIFIED',
          'COMMERCIAL_SOURCE_UNVERIFIED',
          'LOW_CONFIDENCE_COMMERCIAL_SOURCE',
          'LOW_CONFIDENCE_NON_MEDICINE_REVIEW',
        ],
      },
    },
    select: {
      id: true,
      productName: true,
      genericName: true,
      brandId: true,
      primarySourceDocumentId: true,
    },
    orderBy: { productName: 'asc' },
  });
  const desired = products
    .map((product) => ({
      ...product,
      brandName: deriveBrandName(product.productName, product.genericName),
    }))
    .filter((product): product is typeof product & { brandName: string } => Boolean(product.brandName));

  const normalizedBrandNames = [...new Set(desired.map((product) => normalizeText(product.brandName)))];
  const existingBrands = await prisma.brand.findMany({
    where: { normalizedName: { in: normalizedBrandNames } },
    select: { id: true, normalizedName: true },
  });
  const existingBrandKeys = new Set(existingBrands.map((brand) => brand.normalizedName));
  const brandRows: Prisma.BrandCreateManyInput[] = [];
  for (const product of desired) {
    const normalizedName = normalizeText(product.brandName);
    if (existingBrandKeys.has(normalizedName)) {
      continue;
    }
    existingBrandKeys.add(normalizedName);
    brandRows.push({
      name: product.brandName,
      normalizedName,
      isActive: true,
    });
  }

  await createManyInChunks(brandRows, (chunk) => prisma.brand.createMany({ data: chunk, skipDuplicates: true }), 500);

  const brands = await prisma.brand.findMany({
    where: { normalizedName: { in: normalizedBrandNames } },
    select: { id: true, normalizedName: true },
  });
  const brandIdByNormalizedName = new Map(brands.map((brand) => [brand.normalizedName, brand.id]));
  const productUpdates = desired
    .map((product) => {
      const brandId = brandIdByNormalizedName.get(normalizeText(product.brandName));
      if (!brandId || product.brandId === brandId) {
        return null;
      }
      return () => prisma.drugProduct.update({ where: { id: product.id }, data: { brandId } });
    })
    .filter(Boolean) as Array<() => Prisma.PrismaPromise<unknown>>;

  await runUpdatesInChunks(productUpdates, 50);

  const productIds = desired.map((product) => product.id);
  const existingAliases = await prisma.productAlias.findMany({
    where: { drugProductId: { in: productIds }, aliasType: AliasType.BRAND },
    select: { drugProductId: true, normalizedAlias: true },
  });
  const existingAliasKeys = new Set(existingAliases.map((alias) => `${alias.drugProductId}:${alias.normalizedAlias}`));
  const aliasRows: Prisma.ProductAliasCreateManyInput[] = [];
  for (const product of desired) {
    const normalizedAlias = normalizeText(product.brandName);
    const key = `${product.id}:${normalizedAlias}`;
    if (existingAliasKeys.has(key)) {
      continue;
    }
    existingAliasKeys.add(key);
    aliasRows.push({
      drugProductId: product.id,
      sourceDocumentId: product.primarySourceDocumentId,
      alias: product.brandName,
      normalizedAlias,
      aliasType: AliasType.BRAND,
      isPreferred: true,
    });
  }

  await createManyInChunks(aliasRows, (chunk) => prisma.productAlias.createMany({ data: chunk }), 500);

  const [totalBrandedProducts, totalBrands, totalBrandAliases] = await Promise.all([
    prisma.drugProduct.count({ where: { brandId: { not: null } } }),
    prisma.brand.count(),
    prisma.productAlias.count({ where: { aliasType: AliasType.BRAND } }),
  ]);

  console.log(
    JSON.stringify(
      {
        processed: products.length,
        desiredBrandLinks: desired.length,
        brandRowsAdded: brandRows.length,
        productsLinked: productUpdates.length,
        brandAliasesAdded: aliasRows.length,
        totalBrandedProducts,
        totalBrands,
        totalBrandAliases,
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
