// backend/src/modules/overrides/overrides.service.ts

import { PrismaClient, OverrideType } from '@prisma/client';

const prisma = new PrismaClient();

export interface ListOverridesQuery {
  outletId: string;
  page?: number;
  pageSize?: number;
  flagged?: boolean;
  overrideType?: OverrideType;
  dispensedById?: string;
  dateFrom?: string;  // ISO date string
  dateTo?: string;    // ISO date string
}

export async function listOverrides(query: ListOverridesQuery) {
  const {
    outletId,
    page = 1,
    pageSize = 25,
    flagged,
    overrideType,
    dispensedById,
    dateFrom,
    dateTo,
  } = query;

  const skip = (page - 1) * pageSize;

  const where = {
    outletId,
    ...(flagged !== undefined ? { flagged } : {}),
    ...(overrideType ? { overrideType } : {}),
    ...(dispensedById ? { dispensedById } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.overrideLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.overrideLog.count({ where }),
  ]);

  // Summary counts (scoped to outlet, not filtered)
  const [totalCount, flaggedCount, unreviewedCount] = await Promise.all([
    prisma.overrideLog.count({ where: { outletId } }),
    prisma.overrideLog.count({ where: { outletId, flagged: true } }),
    prisma.overrideLog.count({ where: { outletId, flagged: true, reviewedAt: null } }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    summary: {
      total: totalCount,
      flagged: flaggedCount,
      pendingReview: unreviewedCount,
    },
  };
}

export async function getOverride(id: string, outletId: string) {
  const log = await prisma.overrideLog.findFirst({
    where: { id, outletId },
  });

  if (!log) return null;
  return log;
}

export async function flagOverride(
  id: string,
  outletId: string,
  reviewerId: string,
  flagReason: string,
) {
  const existing = await prisma.overrideLog.findFirst({ where: { id, outletId } });
  if (!existing) return null;

  return prisma.overrideLog.update({
    where: { id },
    data: {
      flagged: true,
      flagReason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });
}

export async function unflagOverride(
  id: string,
  outletId: string,
  reviewerId: string,
) {
  const existing = await prisma.overrideLog.findFirst({ where: { id, outletId } });
  if (!existing) return null;

  return prisma.overrideLog.update({
    where: { id },
    data: {
      flagged: false,
      flagReason: null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });
}
