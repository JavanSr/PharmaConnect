import { prisma } from '../../lib/prisma';

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

export async function getStockoutForecast(input: {
  pharmacyId: string;
  lookbackDays?: number;
  leadTimeDays?: number;
  limit?: number;
}) {
  const lookbackDays = input.lookbackDays ?? 30;
  const leadTimeDays = input.leadTimeDays ?? 14;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  const [products, batches, dispensedMovements] = await Promise.all([
    prisma.product.findMany({
      where: { pharmacyId: input.pharmacyId, isActive: true },
      select: {
        id: true,
        name: true,
        genericName: true,
        reorderLevel: true,
        sellingPrice: true,
      },
    }),
    prisma.batch.findMany({
      where: { pharmacyId: input.pharmacyId },
      select: {
        productId: true,
        quantityRemaining: true,
      },
    }),
    prisma.stockMovement.findMany({
      where: {
        pharmacyId: input.pharmacyId,
        type: 'DISPENSED',
        createdAt: { gte: since },
      },
      select: {
        productId: true,
        quantity: true,
      },
    }),
  ]);

  const currentStockByProduct = new Map<string, number>();
  batches.forEach((batch) => {
    currentStockByProduct.set(batch.productId, (currentStockByProduct.get(batch.productId) ?? 0) + batch.quantityRemaining);
  });

  const dispensedByProduct = new Map<string, number>();
  dispensedMovements.forEach((movement) => {
    dispensedByProduct.set(movement.productId, (dispensedByProduct.get(movement.productId) ?? 0) + movement.quantity);
  });

  return products
    .map((product) => {
      const currentStock = currentStockByProduct.get(product.id) ?? 0;
      const dispensedUnits = dispensedByProduct.get(product.id) ?? 0;
      const avgDailyDemand = dispensedUnits / lookbackDays;
      const daysUntilStockout = avgDailyDemand > 0 ? Number((currentStock / avgDailyDemand).toFixed(1)) : null;
      const estimatedStockoutDate = daysUntilStockout != null
        ? new Date(Date.now() + daysUntilStockout * 86_400_000).toISOString()
        : null;
      const valueTzs = currentStock * Number(product.sellingPrice ?? 0);
      const status =
        currentStock <= 0
          ? 'OUT'
          : daysUntilStockout != null && daysUntilStockout <= leadTimeDays
            ? 'RISK'
            : 'OK';

      return {
        productId: product.id,
        productName: product.genericName || product.name,
        currentStock,
        reorderLevel: product.reorderLevel,
        avgDailyDemand,
        leadTimeDays,
        daysUntilStockout,
        estimatedStockoutDate,
        valueTzs,
        status,
      };
    })
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status.localeCompare(right.status);
      }
      return (left.daysUntilStockout ?? Number.POSITIVE_INFINITY) - (right.daysUntilStockout ?? Number.POSITIVE_INFINITY);
    })
    .slice(0, input.limit ?? 20);
}

export async function getSeasonalitySeries(pharmacyId: string) {
  const start = new Date();
  start.setMonth(start.getMonth() - 11, 1);
  start.setHours(0, 0, 0, 0);

  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      label: date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      dispensedUnits: 0,
      revenueTzs: 0,
    };
  });

  const [movements, dispensings] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        pharmacyId,
        type: 'DISPENSED',
        createdAt: { gte: start },
      },
      select: {
        createdAt: true,
        quantity: true,
      },
    }),
    prisma.dispensing.findMany({
      where: {
        pharmacyId,
        createdAt: { gte: start },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    }),
  ]);

  const monthMap = new Map(months.map((month) => [month.key, month]));
  movements.forEach((movement) => {
    const key = `${movement.createdAt.getFullYear()}-${String(movement.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const month = monthMap.get(key);
    if (month) {
      month.dispensedUnits += movement.quantity;
    }
  });
  dispensings.forEach((dispensing) => {
    const key = `${dispensing.createdAt.getFullYear()}-${String(dispensing.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const month = monthMap.get(key);
    if (month) {
      month.revenueTzs += Number(dispensing.totalAmount);
    }
  });

  return months;
}

export async function getDeadStock(pharmacyId: string, limit = 20) {
  const [products, batches, sales] = await Promise.all([
    prisma.product.findMany({
      where: { pharmacyId, isActive: true },
      select: {
        id: true,
        name: true,
        genericName: true,
        sellingPrice: true,
      },
    }),
    prisma.batch.findMany({
      where: { pharmacyId },
      select: {
        productId: true,
        quantityRemaining: true,
        receivedAt: true,
      },
    }),
    prisma.stockMovement.findMany({
      where: {
        pharmacyId,
        type: 'DISPENSED',
      },
      select: {
        productId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const stockByProduct = new Map<string, { quantity: number; oldestBatchAt: Date | null }>();
  batches.forEach((batch) => {
    const existing = stockByProduct.get(batch.productId) ?? { quantity: 0, oldestBatchAt: null };
    existing.quantity += batch.quantityRemaining;
    if (!existing.oldestBatchAt || batch.receivedAt < existing.oldestBatchAt) {
      existing.oldestBatchAt = batch.receivedAt;
    }
    stockByProduct.set(batch.productId, existing);
  });

  const lastSaleByProduct = new Map<string, Date>();
  sales.forEach((sale) => {
    if (!lastSaleByProduct.has(sale.productId)) {
      lastSaleByProduct.set(sale.productId, sale.createdAt);
    }
  });

  const now = new Date();

  return products
    .map((product) => {
      const stock = stockByProduct.get(product.id);
      const currentStock = stock?.quantity ?? 0;
      const valueTzs = currentStock * Number(product.sellingPrice ?? 0);
      const anchorDate = lastSaleByProduct.get(product.id) ?? stock?.oldestBatchAt ?? now;
      const daysSinceSale = daysBetween(anchorDate, now);
      const deadStockScore = daysSinceSale * valueTzs;

      return {
        productId: product.id,
        productName: product.genericName || product.name,
        currentStock,
        valueTzs,
        daysSinceSale,
        deadStockScore,
        lastSaleAt: lastSaleByProduct.get(product.id)?.toISOString() ?? null,
      };
    })
    .filter((row) => row.currentStock > 0)
    .sort((left, right) => right.deadStockScore - left.deadStockScore)
    .slice(0, limit);
}

export function getRegionalForecastStub() {
  const enabled = process.env.FEATURE_REGIONAL_FORECASTING === 'true';
  return enabled
    ? {
        enabled: true,
        status: 'stub',
        message: 'Regional forecasting is enabled behind a feature flag but not implemented yet.',
      }
    : {
        enabled: false,
        status: 'disabled',
        message: 'Regional forecasting is disabled.',
      };
}
