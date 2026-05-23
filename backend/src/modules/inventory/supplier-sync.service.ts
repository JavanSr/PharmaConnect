import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';

export async function getApotekWholesalers(region?: string) {
  const where: Prisma.SupplierWhereInput = {
    isApotekNetworkWholesaler: true,
    isActive: true,
  };

  const suppliers = await prisma.supplier.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      pharmacy: {
        select: {
          id: true,
          name: true,
          licenceNumber: true,
          region: true,
          subscriptionTier: true,
        },
      },
      _count: {
        select: { supplierCatalogues: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    pharmacyId: s.pharmacy?.id,
    pharmacyName: s.pharmacy?.name,
    licenceNumber: s.pharmacy?.licenceNumber,
    region: s.pharmacy?.region,
    subscriptionTier: s.pharmacy?.subscriptionTier,
    catalogueCacheCount: s._count.supplierCatalogues,
  }));
}

export async function syncSupplierCatalogue(
  retailPharmacyId: string,
  supplierId: string,
  forceResync: boolean = false,
) {
  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    // Validate supplier exists and is APOTEKH wholesaler
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, isApotekNetworkWholesaler: true, isActive: true },
      select: { id: true, wholesalerPharmacyId: true, name: true },
    });

    if (!supplier) {
      throw Object.assign(new Error('Supplier not found or is not an APOTEKH wholesaler'), { status: 404 });
    }

    // Check if already synced recently (unless force = true)
    const existing = await tx.supplierCatalogue.findFirst({
      where: { wholesalerId: supplierId, retailPharmacyId },
    });

    if (existing && !forceResync) {
      const secondsAgo = existing.lastSyncedAt ? Math.round((Date.now() - existing.lastSyncedAt.getTime()) / 1000) : null;
      // If synced in last 6 hours, skip
      if (secondsAgo && secondsAgo < 6 * 60 * 60) {
        return existing;
      }
    }

    // Fetch wholesaler's products (isWholesaleProduct = true)
    const wholesalerPharmacyId = supplier.wholesalerPharmacyId;
    if (!wholesalerPharmacyId) {
      throw Object.assign(new Error('Supplier has no linked wholesaler pharmacy'), { status: 400 });
    }

    const products = await tx.product.findMany({
      where: {
        pharmacyId: wholesalerPharmacyId,
        isActive: true,
        wholesaleStock: true,
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        wholesaleSellingPrice: true,
      },
    });

    // Fetch batches for those products to get expiry and availability
    const batches = await tx.batch.findMany({
      where: {
        pharmacyId: wholesalerPharmacyId,
        product: { isActive: true, wholesaleStock: true },
        quantityRemaining: { gt: 0 },
      },
      select: {
        productId: true,
        batchNumber: true,
        expiryDate: true,
        quantityRemaining: true,
        purchasePrice: true,
      },
    });

    // Group batches by product for easy lookup
    const batchesByProduct = new Map<string, typeof batches>();
    for (const batch of batches) {
      if (!batchesByProduct.has(batch.productId)) {
        batchesByProduct.set(batch.productId, []);
      }
      batchesByProduct.get(batch.productId)!.push(batch);
    }

    // Create or update catalogue record
    const catalogue = await tx.supplierCatalogue.upsert({
      where: {
        wholesalerId_retailPharmacyId: { wholesalerId: supplierId, retailPharmacyId },
      },
      update: {
        lastSyncedAt: new Date(),
        syncStatus: 'ACTIVE',
        lastSyncError: null,
        totalItemsAvailable: products.length,
      },
      create: {
        wholesalerId: supplierId,
        retailPharmacyId,
        lastSyncedAt: new Date(),
        syncStatus: 'ACTIVE',
        totalItemsAvailable: products.length,
      },
    });

    // Delete old items for this catalogue
    await tx.supplierCatalogueItem.deleteMany({ where: { catalogueId: catalogue.id } });

    // Create new items
    const itemsToCreate: Prisma.SupplierCatalogueItemCreateManyInput[] = [];

    for (const product of products) {
      const productBatches = batchesByProduct.get(product.id) || [];

      // Create one item per batch (for FEFO tracking)
      if (productBatches.length > 0) {
        for (const batch of productBatches) {
          itemsToCreate.push({
            catalogueId: catalogue.id,
            productId: product.id,
            productName: product.name,
            genericName: product.genericName,
            strength: product.strength,
            dosageForm: product.dosageForm,
            quantityAvailable: batch.quantityRemaining,
            unitPrice: product.wholesaleSellingPrice || batch.purchasePrice,
            minimumOrderQuantity: 1,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
          });
        }
      } else {
        // Product has no batches, create item with 0 availability
        itemsToCreate.push({
          catalogueId: catalogue.id,
          productId: product.id,
          productName: product.name,
          genericName: product.genericName,
          strength: product.strength,
          dosageForm: product.dosageForm,
          quantityAvailable: 0,
          unitPrice: product.wholesaleSellingPrice || 0,
          minimumOrderQuantity: 1,
          batchNumber: null,
          expiryDate: null,
        });
      }
    }

    await tx.supplierCatalogueItem.createMany({ data: itemsToCreate });

    return {
      id: catalogue.id,
      wholesalerId: catalogue.wholesalerId,
      retailPharmacyId: catalogue.retailPharmacyId,
      itemCount: itemsToCreate.length,
      lastSyncedAt: catalogue.lastSyncedAt,
      syncStatus: catalogue.syncStatus,
    };
  }));
}

export async function getRetailPharmacyCatalogues(retailPharmacyId: string, syncStatus?: string) {
  const where: Prisma.SupplierCatalogueWhereInput = {
    retailPharmacyId,
    ...(syncStatus ? { syncStatus } : {}),
  };

  const catalogues = await prisma.supplierCatalogue.findMany({
    where,
    select: {
      id: true,
      wholesalerId: true,
      lastSyncedAt: true,
      syncStatus: true,
      totalItemsAvailable: true,
      _count: { select: { items: true } },
      wholesaler: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          pharmacy: {
            select: {
              name: true,
              region: true,
              subscriptionTier: true,
            },
          },
        },
      },
    },
    orderBy: { lastSyncedAt: 'desc' },
  });

  return catalogues.map((c) => ({
    id: c.id,
    wholesalerId: c.wholesalerId,
    wholesalerName: c.wholesaler?.name,
    wholesalerPhone: c.wholesaler?.phone,
    wholesalerEmail: c.wholesaler?.email,
    pharmacyName: c.wholesaler?.pharmacy?.name,
    region: c.wholesaler?.pharmacy?.region,
    subscriptionTier: c.wholesaler?.pharmacy?.subscriptionTier,
    itemCount: c._count.items,
    lastSyncedAt: c.lastSyncedAt,
    syncStatus: c.syncStatus,
  }));
}

export async function searchSupplierCatalogueItems(
  catalogueId: string,
  filters: { search?: string; page?: number; limit?: number },
) {
  const page = Math.max(filters.page ?? 1, 1);
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierCatalogueItemWhereInput = {
    catalogueId,
    ...(filters.search
      ? {
          OR: [
            { productName: { contains: filters.search, mode: 'insensitive' } },
            { genericName: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.supplierCatalogueItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { expiryDate: 'asc' }, // FEFO: earliest expiry first
        { productName: 'asc' },
      ],
      select: {
        id: true,
        productId: true,
        productName: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        quantityAvailable: true,
        unitPrice: true,
        minimumOrderQuantity: true,
        batchNumber: true,
        expiryDate: true,
      },
    }),
    prisma.supplierCatalogueItem.count({ where }),
  ]);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function getPriceComparison(
  retailPharmacyId: string,
  productName: string,
  genericName?: string,
) {
  const results = await prisma.supplierCatalogueItem.findMany({
    where: {
      catalogue: {
        retailPharmacyId,
      },
      OR: [
        { productName: { contains: productName, mode: 'insensitive' } },
        genericName ? { genericName: { contains: genericName, mode: 'insensitive' } } : undefined,
      ].filter(Boolean) as Prisma.SupplierCatalogueItemWhereInput[],
    },
    select: {
      id: true,
      productName: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      quantityAvailable: true,
      unitPrice: true,
      minimumOrderQuantity: true,
      catalogue: {
        select: {
          wholesalerId: true,
          wholesaler: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { unitPrice: 'asc' },
  });

  return results.map((item) => ({
    id: item.id,
    productName: item.productName,
    genericName: item.genericName,
    strength: item.strength,
    dosageForm: item.dosageForm,
    quantityAvailable: item.quantityAvailable,
    unitPrice: item.unitPrice.toNumber(),
    minimumOrderQuantity: item.minimumOrderQuantity,
    wholesalerId: item.catalogue?.wholesalerId,
    wholesalerName: item.catalogue?.wholesaler?.name,
    wholesalerPhone: item.catalogue?.wholesaler?.phone,
    wholesalerEmail: item.catalogue?.wholesaler?.email,
  }));
}
