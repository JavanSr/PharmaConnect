import { Prisma, ReviewQueueStatus, ReviewerType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import type { AuthenticatedUserContext } from '../../middleware/auth';

type ReviewQueueViewer = Pick<AuthenticatedUserContext, 'userId' | 'role' | 'normalizedRole' | 'pharmacyId'>;

type ReviewQueueFilters = {
  status?: ReviewQueueStatus;
  entityType?: string;
  reviewerType?: ReviewerType;
  page?: number;
  limit?: number;
};

type ReviewQueueUpdateInput = {
  status: Extract<ReviewQueueStatus, 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETIRED'>;
  reviewerType?: ReviewerType;
  notes?: string;
  proposedPayload?: unknown;
};

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  return value as Prisma.InputJsonValue;
}

function canReviewPlatformQueue(viewer: ReviewQueueViewer) {
  return viewer.normalizedRole === 'SUPER_ADMIN';
}

function assertReviewAccess(viewer: ReviewQueueViewer) {
  if (['SUPER_ADMIN', 'OWNER', 'PHARMACIST_IN_CHARGE'].includes(viewer.normalizedRole)) {
    return;
  }

  throw Object.assign(new Error('Review workflow access denied'), {
    status: 403,
    code: 'ROLE_INSUFFICIENT',
  });
}

function queueScopeWhere(viewer: ReviewQueueViewer): Prisma.DataReviewQueueWhereInput {
  if (canReviewPlatformQueue(viewer)) {
    return {};
  }

  if (!viewer.pharmacyId) {
    throw Object.assign(new Error('Pharmacy-scoped review requires an active pharmacy'), {
      status: 400,
      code: 'PHARMACY_SCOPE_REQUIRED',
    });
  }

  return {
    pharmacyId: viewer.pharmacyId,
  };
}

async function attachUserSummaries<
  T extends {
    reviewerUserId?: string | null;
    auditLogs?: Array<{ actorUserId?: string | null }>;
  },
>(items: T[]) {
  const userIds = new Set<string>();
  for (const item of items) {
    if (item.reviewerUserId) {
      userIds.add(item.reviewerUserId);
    }
    for (const auditLog of item.auditLogs ?? []) {
      if (auditLog.actorUserId) {
        userIds.add(auditLog.actorUserId);
      }
    }
  }

  if (userIds.size === 0) {
    return items.map((item) => ({
      ...item,
      reviewerUser: null,
      auditLogs: (item.auditLogs ?? []).map((auditLog) => ({
        ...auditLog,
        actorUser: null,
      })),
    }));
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  const userById = new Map(users.map((user) => [user.id, user]));

  return items.map((item) => ({
    ...item,
    reviewerUser: item.reviewerUserId ? (userById.get(item.reviewerUserId) ?? null) : null,
    auditLogs: (item.auditLogs ?? []).map((auditLog) => ({
      ...auditLog,
      actorUser: auditLog.actorUserId ? (userById.get(auditLog.actorUserId) ?? null) : null,
    })),
  }));
}

export async function listReviewQueue(viewer: ReviewQueueViewer, filters: ReviewQueueFilters) {
  assertReviewAccess(viewer);

  const page = Math.max(filters.page ?? 1, 1);
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.DataReviewQueueWhereInput = {
    ...queueScopeWhere(viewer),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.reviewerType ? { reviewerType: filters.reviewerType } : {}),
  };

  const [rows, total] = await withPrismaRetry(() => Promise.all([
    prisma.dataReviewQueue.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        sourceDocument: {
          select: {
            id: true,
            title: true,
            sourceName: true,
            url: true,
            sourceType: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    }),
    prisma.dataReviewQueue.count({ where }),
  ]));

  const enriched = await attachUserSummaries(rows);
  return {
    data: enriched,
    total,
    page,
    limit,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

export async function getReviewQueueEntry(viewer: ReviewQueueViewer, id: string) {
  assertReviewAccess(viewer);

  const entry = await prisma.dataReviewQueue.findFirst({
    where: {
      id,
      ...queueScopeWhere(viewer),
    },
    include: {
      sourceDocument: {
        select: {
          id: true,
          title: true,
          sourceName: true,
          url: true,
          sourceType: true,
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!entry) {
    throw Object.assign(new Error('Review queue entry not found'), {
      status: 404,
      code: 'REVIEW_QUEUE_ENTRY_NOT_FOUND',
    });
  }

  const [enriched] = await attachUserSummaries([entry]);
  return enriched;
}

export async function updateReviewQueueEntry(viewer: ReviewQueueViewer, id: string, input: ReviewQueueUpdateInput) {
  assertReviewAccess(viewer);

  return withPrismaRetry(() => prisma.$transaction(async (tx) => {
    const existing = await tx.dataReviewQueue.findFirst({
      where: {
        id,
        ...queueScopeWhere(viewer),
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Review queue entry not found'), {
        status: 404,
        code: 'REVIEW_QUEUE_ENTRY_NOT_FOUND',
      });
    }

    const reviewerType = canReviewPlatformQueue(viewer)
      ? input.reviewerType ?? ReviewerType.PLATFORM_PHARMACIST
      : ReviewerType.PIC_OVERRIDE;

    if (!canReviewPlatformQueue(viewer) && existing.pharmacyId !== viewer.pharmacyId) {
      throw Object.assign(new Error('Review queue entry is outside your pharmacy scope'), {
        status: 403,
        code: 'REVIEW_QUEUE_SCOPE_MISMATCH',
      });
    }

    const updated = await tx.dataReviewQueue.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        reviewerType,
        reviewerUserId: viewer.userId,
        notes: input.notes?.trim() || existing.notes,
        proposedPayload: toInputJsonValue(input.proposedPayload ?? existing.proposedPayload),
        reviewedAt: ['APPROVED', 'REJECTED', 'RETIRED'].includes(input.status) ? new Date() : null,
      },
      include: {
        sourceDocument: {
          select: {
            id: true,
            title: true,
            sourceName: true,
            url: true,
            sourceType: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await tx.dataReviewAuditLog.create({
      data: {
        queueId: existing.id,
        action: 'STATUS_UPDATED',
        previousStatus: existing.status,
        nextStatus: input.status,
        reviewerType,
        actorUserId: viewer.userId,
        actorRole: viewer.role,
        pharmacyId: existing.pharmacyId,
        note: input.notes?.trim() || null,
        payloadSnapshot: toInputJsonValue({
          currentPayload: existing.currentPayload,
          proposedPayload: input.proposedPayload ?? existing.proposedPayload,
        }),
      },
    });

    const [enriched] = await attachUserSummaries([updated]);
    return enriched;
  }));
}
