import { ComplianceStatus, Prisma } from "@prisma/client";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { appConfig } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  getEffectiveComplianceStatus,
  isLowStock,
  isNearExpiry,
  isOutOfStock,
} from "@/lib/utils";

type ScopeUser = {
  id: string;
  pharmacyId: string | null;
};

function getPharmacyId(user: ScopeUser) {
  if (!user.pharmacyId) {
    throw new Error("User is not linked to a pharmacy.");
  }

  return user.pharmacyId;
}

export async function getDashboardData(user: ScopeUser) {
  const pharmacyId = getPharmacyId(user);

  const [pharmacy, products, complianceItems, featuredArticle, publishedArticles, notifications] =
    await Promise.all([
      prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
      }),
      prisma.product.findMany({
        where: { pharmacyId, isArchived: false },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.complianceItem.findMany({
        where: { pharmacyId },
        orderBy: { deadlineDate: "asc" },
      }),
      prisma.knowledgeArticle.findFirst({
        where: { featured: true, published: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.knowledgeArticle.count({
        where: { published: true },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  const lowStockItems = products.filter(isLowStock);
  const expiringSoon = products.filter((product) => isNearExpiry(product));
  const outOfStock = products.filter(isOutOfStock);

  const upcomingCompliance = complianceItems.filter(
    (item) => getEffectiveComplianceStatus(item) === ComplianceStatus.PENDING,
  );
  const overdueCompliance = complianceItems.filter(
    (item) => getEffectiveComplianceStatus(item) === ComplianceStatus.OVERDUE,
  );

  return {
    pharmacy,
    featuredArticle,
    notifications,
    publishedArticles,
    inventorySummary: {
      totalItems: products.length,
      lowStockItems: lowStockItems.length,
      expiringSoon: expiringSoon.length,
      outOfStock: outOfStock.length,
    },
    complianceSummary: {
      total: complianceItems.length,
      upcoming: upcomingCompliance.length,
      overdue: overdueCompliance.length,
      completed: complianceItems.filter(
        (item) => getEffectiveComplianceStatus(item) === ComplianceStatus.COMPLETED,
      ).length,
    },
    alerts: {
      lowStockItems: lowStockItems.slice(0, 4),
      expiringSoon: expiringSoon.slice(0, 4),
      upcomingCompliance: upcomingCompliance.slice(0, 4),
      overdueCompliance: overdueCompliance.slice(0, 4),
    },
  };
}

export async function getInventoryData(
  user: ScopeUser,
  filters: {
    q?: string;
    status?: string;
    category?: string;
  },
) {
  const pharmacyId = getPharmacyId(user);
  const expiryThreshold = addDays(new Date(), appConfig.expiryWarningDays);

  const where: Prisma.ProductWhereInput = {
    pharmacyId,
    isArchived: false,
    ...(filters.q
      ? {
          OR: [
            { productName: { contains: filters.q } },
            { genericName: { contains: filters.q } },
            { brandName: { contains: filters.q } },
            { supplier: { contains: filters.q } },
            { batchNumber: { contains: filters.q } },
          ],
        }
      : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status === "out" ? { quantity: { lte: 0 } } : {}),
    ...(filters.status === "low"
      ? { quantity: { gt: 0, lte: prisma.product.fields.reorderLevel } }
      : {}),
    ...(filters.status === "expiring" ? { expiryDate: { lte: expiryThreshold } } : {}),
  };

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { productName: "asc" }],
    }),
    prisma.stockMovement.findMany({
      where: { pharmacyId },
      include: { product: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    products,
    movements,
    summary: {
      totalItems: products.length,
      lowStockItems: products.filter(isLowStock).length,
      expiringSoon: products.filter((product) => isNearExpiry(product)).length,
      outOfStock: products.filter(isOutOfStock).length,
    },
    productOptions: products.map((product) => ({
      id: product.id,
      name: product.productName,
      quantity: product.quantity,
    })),
  };
}

export async function getProductById(user: ScopeUser, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      pharmacyId: getPharmacyId(user),
    },
  });
}

export async function getKnowledgeHubData(
  filters: { q?: string; category?: string },
  options?: { includeUnpublished?: boolean },
) {
  const where: Prisma.KnowledgeArticleWhereInput = {
    ...(options?.includeUnpublished ? {} : { published: true }),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q } },
            { summary: { contains: filters.q } },
            { content: { contains: filters.q } },
          ],
        }
      : {}),
    ...(filters.category ? { category: filters.category as never } : {}),
  };

  const [articles, featuredArticle] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      include: { createdBy: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.knowledgeArticle.findFirst({
      where: { featured: true, published: true },
      include: { createdBy: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { articles, featuredArticle };
}

export async function getArticleById(articleId: string, options?: { includeUnpublished?: boolean }) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: articleId },
    include: { createdBy: true },
  });

  if (!options?.includeUnpublished && article && !article.published) {
    return null;
  }

  return article;
}

export async function getComplianceData(
  user: ScopeUser,
  filters: {
    q?: string;
    status?: string;
    view?: string;
  },
) {
  const pharmacyId = getPharmacyId(user);

  const items = await prisma.complianceItem.findMany({
    where: {
      pharmacyId,
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q } },
              { category: { contains: filters.q } },
              { authority: { contains: filters.q } },
            ],
          }
        : {}),
    },
    include: { createdBy: true },
    orderBy: { deadlineDate: "asc" },
  });

  const effectiveItems = items.filter((item) => {
    if (!filters.status || filters.status === "all") return true;
    return getEffectiveComplianceStatus(item).toLowerCase() === filters.status;
  });

  const today = new Date();

  return {
    items: effectiveItems,
    calendarRange: {
      start: startOfMonth(today),
      end: endOfMonth(today),
    },
    summary: {
      upcoming: items.filter((item) => getEffectiveComplianceStatus(item) === ComplianceStatus.PENDING)
        .length,
      overdue: items.filter((item) => getEffectiveComplianceStatus(item) === ComplianceStatus.OVERDUE)
        .length,
      completed: items.filter((item) => getEffectiveComplianceStatus(item) === ComplianceStatus.COMPLETED)
        .length,
      nextReminder: items.find(
        (item) =>
          item.reminderDate <= addDays(new Date(), 14) &&
          getEffectiveComplianceStatus(item) === ComplianceStatus.PENDING,
      ),
    },
  };
}

export async function getComplianceItemById(user: ScopeUser, itemId: string) {
  return prisma.complianceItem.findFirst({
    where: {
      id: itemId,
      pharmacyId: getPharmacyId(user),
    },
  });
}

export async function getPilotNetwork() {
  return prisma.pharmacy.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getAppSettingsData(user: ScopeUser) {
  const pharmacyId = getPharmacyId(user);

  const [pharmacy, users] = await Promise.all([
    prisma.pharmacy.findUnique({ where: { id: pharmacyId } }),
    prisma.user.findMany({
      where: { pharmacyId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    pharmacy,
    users,
    expiryWarningDays: appConfig.expiryWarningDays,
  };
}
