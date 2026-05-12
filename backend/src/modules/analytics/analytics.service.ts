import { Prisma, type SubscriptionTier } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { normalizeTier, type SupportedTier } from '../../types/roles';

export const ANALYTICS_COMPARE_METRICS = ['DISPENSED_UNITS', 'RECEIVED_UNITS', 'REVENUE_TZS'] as const;
export const ANALYTICS_COMPARE_RANGES = ['7D', '30D', '90D', '12M'] as const;

export type AnalyticsCompareMetric = (typeof ANALYTICS_COMPARE_METRICS)[number];
export type AnalyticsCompareRange = (typeof ANALYTICS_COMPARE_RANGES)[number];

export type AnalyticsFeatureSet = {
  tier: SupportedTier | null;
  historyDays: number;
  charts: string[];
  stockout: boolean;
  benchmark: boolean;
  forecast: boolean;
  seasonality: boolean;
  deadStock: boolean;
  multiOutletCompare: boolean;
};

type TimeSeriesPoint = {
  key: string;
  label: string;
};

type DispensingRevenueRow = {
  totalRevenue: number | null;
};

type DispensingSeriesRow = {
  pharmacyId: string;
  createdAt: Date;
  totalAmount: number;
};

const DEFAULT_FEATURE_SET: AnalyticsFeatureSet = {
  tier: null,
  historyDays: 30,
  charts: ['summary'],
  stockout: false,
  benchmark: false,
  forecast: false,
  seasonality: false,
  deadStock: false,
  multiOutletCompare: false,
};

export function getAnalyticsFeatureSet(subscriptionTier: SubscriptionTier | null | undefined): AnalyticsFeatureSet {
  const tier = normalizeTier(subscriptionTier ?? null);
  switch (tier) {
    case 'ADDO':
      return {
        tier,
        historyDays: 30,
        charts: ['summary', 'movements', 'revenue', 'stock_value'],
        stockout: false,
        benchmark: false,
        forecast: false,
        seasonality: false,
        deadStock: false,
        multiOutletCompare: false,
      };
    case 'ESSENTIAL':
      return {
        tier,
        historyDays: 90,
        charts: ['summary', 'movements', 'revenue', 'stock_value'],
        stockout: false,
        benchmark: false,
        forecast: false,
        seasonality: false,
        deadStock: false,
        multiOutletCompare: false,
      };
    case 'STANDARD':
      return {
        tier,
        historyDays: 365,
        charts: ['summary', 'movements', 'revenue', 'stock_value', 'margin', 'top_skus', 'weekly_trends', 'compare'],
        stockout: false,
        benchmark: false,
        forecast: false,
        seasonality: false,
        deadStock: false,
        multiOutletCompare: true,
      };
    case 'PREMIUM':
      return {
        tier,
        historyDays: 365,
        charts: ['summary', 'movements', 'stockout', 'benchmark', 'forecast'],
        stockout: true,
        benchmark: true,
        forecast: true,
        seasonality: true,
        deadStock: true,
        multiOutletCompare: false,
      };
    case 'ENTERPRISE':
      return {
        tier,
        historyDays: 365,
        charts: ['summary', 'movements', 'stockout', 'benchmark', 'forecast', 'compare'],
        stockout: true,
        benchmark: true,
        forecast: true,
        seasonality: true,
        deadStock: true,
        multiOutletCompare: true,
      };
    case 'WHOLESALE':
      return {
        tier,
        historyDays: 365,
        charts: ['summary', 'movements'],
        stockout: false,
        benchmark: false,
        forecast: false,
        seasonality: false,
        deadStock: false,
        multiOutletCompare: false,
      };
    default:
      return DEFAULT_FEATURE_SET;
  }
}

function buildSeries(range: AnalyticsCompareRange): TimeSeriesPoint[] {
  const now = new Date();

  if (range === '12M') {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      };
    });
  }

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
}

function startDateForRange(range: AnalyticsCompareRange): Date {
  const now = new Date();
  const value = new Date(now);
  switch (range) {
    case '7D':
      value.setDate(now.getDate() - 6);
      return value;
    case '30D':
      value.setDate(now.getDate() - 29);
      return value;
    case '90D':
      value.setDate(now.getDate() - 89);
      return value;
    case '12M':
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    default:
      return value;
  }
}

function movementBucketKey(date: Date, range: AnalyticsCompareRange) {
  if (range === '12M') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return date.toISOString().slice(0, 10);
}

export async function getAnalyticsSummary(pharmacyId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [products, batches, recentMovements, complianceItems, dispensingRevenue] = await Promise.all([
    prisma.product.findMany({
      where: { pharmacyId, isActive: true },
      select: {
        id: true,
        name: true,
        reorderLevel: true,
        sellingPrice: true,
        storageCondition: true,
      },
    }),
    prisma.batch.findMany({
      where: { pharmacyId },
      select: {
        productId: true,
        quantityRemaining: true,
        expiryDate: true,
      },
    }),
    prisma.stockMovement.findMany({
      where: {
        pharmacyId,
        createdAt: { gte: since },
      },
      select: {
        type: true,
        quantity: true,
        productId: true,
        product: { select: { name: true } },
      },
    }),
    prisma.complianceItem.findMany({
      where: { pharmacyId },
      select: { status: true },
    }),
    prisma.$queryRaw<DispensingRevenueRow[]>`
      SELECT COALESCE(SUM(total_amount), 0)::float8 AS "totalRevenue"
      FROM dispensing_events
      WHERE pharmacy_id = ${pharmacyId}
        AND created_at >= ${since}
    `,
  ]);

  const stockByProduct = new Map<string, number>();
  const totalStockValue = batches.reduce((sum, batch) => {
    stockByProduct.set(batch.productId, (stockByProduct.get(batch.productId) ?? 0) + batch.quantityRemaining);
    const product = products.find((entry) => entry.id === batch.productId);
    return sum + (batch.quantityRemaining * Number(product?.sellingPrice ?? 0));
  }, 0);

  const lowStockCount = products.filter((product) => {
    const qty = stockByProduct.get(product.id) ?? 0;
    return qty > 0 && qty <= product.reorderLevel;
  }).length;

  const outOfStockCount = products.filter((product) => (stockByProduct.get(product.id) ?? 0) <= 0).length;

  const storageBreakdown = products.reduce<Record<'AMBIENT' | 'REFRIGERATED' | 'FROZEN', number>>((acc, product) => {
    const key = (product.storageCondition === 'REFRIGERATED' || product.storageCondition === 'FROZEN')
      ? product.storageCondition
      : 'AMBIENT';
    acc[key] += 1;
    return acc;
  }, { AMBIENT: 0, REFRIGERATED: 0, FROZEN: 0 });

  const now = Date.now();
  const expiryRisk = {
    days1: 0,
    days7: 0,
    days30: 0,
    days60: 0,
    days90: 0,
  };

  for (const batch of batches) {
    if (batch.quantityRemaining <= 0) {
      continue;
    }

    const days = Math.ceil((batch.expiryDate.getTime() - now) / 86_400_000);
    if (days <= 1) {
      expiryRisk.days1 += 1;
    }
    if (days <= 7) {
      expiryRisk.days7 += 1;
    }
    if (days <= 30) {
      expiryRisk.days30 += 1;
    }
    if (days <= 60) {
      expiryRisk.days60 += 1;
    }
    if (days <= 90) {
      expiryRisk.days90 += 1;
    }
  }

  const movementCounts = recentMovements.reduce<Record<'received' | 'dispensed' | 'adjusted' | 'damaged' | 'other', number>>((acc, movement) => {
    if (movement.type === 'RECEIVED') {
      acc.received += movement.quantity;
    } else if (movement.type === 'DISPENSED') {
      acc.dispensed += movement.quantity;
    } else if (movement.type === 'ADJUSTED') {
      acc.adjusted += movement.quantity;
    } else if (movement.type === 'DAMAGED') {
      acc.damaged += movement.quantity;
    } else {
      acc.other += movement.quantity;
    }
    return acc;
  }, { received: 0, dispensed: 0, adjusted: 0, damaged: 0, other: 0 });

  const topDispensedMap = new Map<string, { name: string; units: number }>();
  for (const movement of recentMovements) {
    if (movement.type !== 'DISPENSED') {
      continue;
    }

    const current = topDispensedMap.get(movement.productId) ?? {
      name: movement.product?.name ?? 'Unknown',
      units: 0,
    };
    current.units += movement.quantity;
    topDispensedMap.set(movement.productId, current);
  }

  const topDispensed = Array.from(topDispensedMap.values())
    .sort((left, right) => right.units - left.units)
    .slice(0, 5);

  const complianceBreakdown = complianceItems.reduce<Record<'GREEN' | 'AMBER' | 'RED' | 'EXPIRED', number>>((acc, item) => {
    if (item.status === 'GREEN' || item.status === 'AMBER' || item.status === 'RED' || item.status === 'EXPIRED') {
      acc[item.status] += 1;
    }
    return acc;
  }, { GREEN: 0, AMBER: 0, RED: 0, EXPIRED: 0 });

  const applicableCompliance = complianceItems.length || 1;
  const weightedScore = complianceBreakdown.GREEN * 1 + complianceBreakdown.AMBER * 0.6 + complianceBreakdown.RED * 0.25;
  const complianceScore = complianceItems.length ? Math.round((weightedScore / applicableCompliance) * 100) : 100;

  return {
    inventory: {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      storageBreakdown,
      expiryRisk,
    },
    movements: {
      periodDays: 30,
      counts: movementCounts,
      topDispensed,
      totalRevenue: dispensingRevenue[0]?.totalRevenue ?? 0,
    },
    compliance: {
      score: complianceScore,
      total: complianceItems.length,
      breakdown: complianceBreakdown,
    },
  };
}

export async function getCompareSeries(input: {
  pharmacyIds: string[];
  metric: AnalyticsCompareMetric;
  range: AnalyticsCompareRange;
}) {
  const labels = buildSeries(input.range);
  const seriesMap = new Map<string, Map<string, number>>();
  const pharmacyNames = new Map<string, string>();

  input.pharmacyIds.forEach((pharmacyId) => {
    seriesMap.set(pharmacyId, new Map(labels.map((label) => [label.key, 0])));
  });

  const pharmacies = await prisma.pharmacy.findMany({
    where: { id: { in: input.pharmacyIds } },
    select: { id: true, name: true },
  });
  pharmacies.forEach((pharmacy) => pharmacyNames.set(pharmacy.id, pharmacy.name));

  const since = startDateForRange(input.range);

  if (input.metric === 'REVENUE_TZS') {
    const dispensings = await prisma.$queryRaw<DispensingSeriesRow[]>(Prisma.sql`
      SELECT
        pharmacy_id AS "pharmacyId",
        created_at AS "createdAt",
        total_amount::float8 AS "totalAmount"
      FROM dispensing_events
      WHERE pharmacy_id IN (${Prisma.join(input.pharmacyIds)})
        AND created_at >= ${since}
    `);

    for (const row of dispensings) {
      const bucket = movementBucketKey(row.createdAt, input.range);
      const target = seriesMap.get(row.pharmacyId);
      if (!target || !target.has(bucket)) {
        continue;
      }
      target.set(bucket, (target.get(bucket) ?? 0) + row.totalAmount);
    }
  } else {
    const movementType = input.metric === 'DISPENSED_UNITS' ? 'DISPENSED' : 'RECEIVED';
    const movements = await prisma.stockMovement.findMany({
      where: {
        pharmacyId: { in: input.pharmacyIds },
        type: movementType,
        createdAt: { gte: since },
      },
      select: {
        pharmacyId: true,
        createdAt: true,
        quantity: true,
      },
    });

    for (const row of movements) {
      const bucket = movementBucketKey(row.createdAt, input.range);
      const target = seriesMap.get(row.pharmacyId);
      if (!target || !target.has(bucket)) {
        continue;
      }
      target.set(bucket, (target.get(bucket) ?? 0) + row.quantity);
    }
  }

  return {
    metric: input.metric,
    range: input.range,
    labels,
    series: input.pharmacyIds.map((pharmacyId) => ({
      pharmacyId,
      pharmacyName: pharmacyNames.get(pharmacyId) ?? pharmacyId,
      values: labels.map((label) => ({
        key: label.key,
        label: label.label,
        value: seriesMap.get(pharmacyId)?.get(label.key) ?? 0,
      })),
    })),
  };
}
