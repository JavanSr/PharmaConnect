import { Prisma, SourceSyncChangeType, SourceSyncStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { MONITORED_SOURCE_SEEDS } from '../../data/source-monitoring';
import {
  loadMasterCatalogSeedForSource,
  normalizeMasterCatalogFingerprint,
  type MasterCatalogSourceKey,
} from '../../data/master-catalog-loaders';

type ProbeResult =
  | {
      ok: true;
      status: number;
      finalUrl: string;
      headers: Record<string, string | null>;
      fingerprint: string;
    }
  | {
      ok: false;
      message: string;
    };

type SourceSnapshot = {
  category: 'MASTER_CATALOG' | 'SAFETY_RULES' | 'GENERIC_SOURCE';
  reviewQueueCount: number;
  importedProductCount?: number;
  sourceRecordCount?: number;
  approvedRuleCounts?: {
    interactions: number;
    contraindications: number;
    warnings: number;
    pregnancyFlags: number;
    lactationFlags: number;
    renalFlags: number;
    hepaticFlags: number;
  };
  sourceFingerprint?: string | null;
  importedFingerprint?: string | null;
  requiresReview: boolean;
  notes: string[];
};

type PlannedChange =
  | {
      kind: 'NEW_SOURCE';
      seed: (typeof MONITORED_SOURCE_SEEDS)[number];
    }
  | {
      kind: 'SOURCE_CHECK_FAILED';
      seed: (typeof MONITORED_SOURCE_SEEDS)[number];
      existing: {
        id: string;
        url: string | null;
        checksum: string | null;
        lastCheckedAt: Date | null;
      };
      message: string;
    }
  | {
      kind: 'SOURCE_METADATA_UPDATED' | 'SOURCE_UNCHANGED';
      seed: (typeof MONITORED_SOURCE_SEEDS)[number];
      existing: {
        id: string;
        url: string | null;
        checksum: string | null;
        documentVersion: string | null;
        lastCheckedAt: Date | null;
      };
      probe: Extract<ProbeResult, { ok: true }>;
      snapshot: SourceSnapshot;
    }
  | {
      kind: 'SOURCE_NOT_MONITORED';
      existing: {
        id: string;
        sourceName: string;
        title: string;
        url: string | null;
        sourceType: string;
        isActive: boolean;
        checksum: string | null;
        documentVersion: string | null;
        lastCheckedAt: Date | null;
      };
    };

function toInputJson(value: unknown): Prisma.InputJsonValue {
  if (value === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  return value as Prisma.InputJsonValue;
}

function inferMasterCatalogSourceKey(seed: (typeof MONITORED_SOURCE_SEEDS)[number]): MasterCatalogSourceKey | null {
  const normalizedTitle = seed.title.trim().toLowerCase();
  if (normalizedTitle.includes('price catalogue')) {
    return 'MSD';
  }

  if (normalizedTitle.includes('national essential medicines list')) {
    return 'NEMLIT';
  }

  return null;
}

async function buildSourceSnapshot(
  sourceDocumentId: string,
  seed: (typeof MONITORED_SOURCE_SEEDS)[number],
): Promise<SourceSnapshot> {
  const reviewQueueCountPromise = prisma.dataReviewQueue.count({
    where: { sourceDocumentId },
  });

  const masterSourceKey = inferMasterCatalogSourceKey(seed);
  if (masterSourceKey) {
    const importedRowsPromise = prisma.drugProduct.findMany({
      where: { primarySourceDocumentId: sourceDocumentId },
      select: {
        productName: true,
        genericName: true,
        dosageFormName: true,
        strengthText: true,
        packSizeLabel: true,
        sourceUrl: true,
      },
      orderBy: [{ genericName: 'asc' }, { productName: 'asc' }],
    });

    const [reviewQueueCount, importedRows] = await Promise.all([
      reviewQueueCountPromise,
      importedRowsPromise,
    ]);

    const importedFingerprint = normalizeMasterCatalogFingerprint(
      importedRows.map((row) => ({
        productName: row.productName,
        genericName: row.genericName ?? row.productName,
        dosageFormName: row.dosageFormName ?? '',
        strengthText: row.strengthText ?? '',
        packSizeLabel: row.packSizeLabel ?? '',
        sourceUrl: row.sourceUrl ?? '',
        therapeuticClassName: '',
        category: '',
        ingredients: [],
        sourceNotes: '',
      })),
    );

    const sourceRecords = loadMasterCatalogSeedForSource(masterSourceKey);
    const sourceFingerprint = normalizeMasterCatalogFingerprint(sourceRecords);
    const countsAligned = importedRows.length === sourceRecords.length;
    const fingerprintsAligned = importedFingerprint === sourceFingerprint;
    const notes: string[] = [];

    if (!countsAligned) {
      notes.push(
        `Imported catalog count ${importedRows.length} differs from the current ${masterSourceKey} source snapshot count ${sourceRecords.length}.`,
      );
    }

    if (!fingerprintsAligned) {
      notes.push(`Imported catalog entries differ from the current ${masterSourceKey} source snapshot.`);
    }

    if (reviewQueueCount > 0) {
      notes.push(`${reviewQueueCount} review-queue item(s) are linked to this source document.`);
    }

    return {
      category: 'MASTER_CATALOG',
      reviewQueueCount,
      importedProductCount: importedRows.length,
      sourceRecordCount: sourceRecords.length,
      importedFingerprint,
      sourceFingerprint,
      requiresReview: !countsAligned || !fingerprintsAligned,
      notes,
    };
  }

  const [
    reviewQueueCount,
    interactions,
    contraindications,
    warnings,
    pregnancyFlags,
    lactationFlags,
    renalFlags,
    hepaticFlags,
  ] = await Promise.all([
    reviewQueueCountPromise,
    prisma.drugInteraction.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.drugContraindication.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.warning.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.pregnancyFlag.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.lactationFlag.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.renalFlag.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
    prisma.hepaticFlag.count({ where: { sourceDocumentId, reviewStatus: 'APPROVED' } }),
  ]);

  const approvedRuleCounts = {
    interactions,
    contraindications,
    warnings,
    pregnancyFlags,
    lactationFlags,
    renalFlags,
    hepaticFlags,
  };
  const totalApprovedRules = Object.values(approvedRuleCounts).reduce((sum, value) => sum + value, 0);
  const notes: string[] = [];

  if (totalApprovedRules === 0) {
    notes.push('No approved safety rules are currently linked to this source document.');
  }

  if (reviewQueueCount > 0) {
    notes.push(`${reviewQueueCount} review-queue item(s) are linked to this source document.`);
  }

  return {
    category: 'SAFETY_RULES',
    reviewQueueCount,
    approvedRuleCounts,
    requiresReview: reviewQueueCount > 0,
    notes,
  };
}

function isMonitoredDocumentCandidate(document: {
  sourceName: string;
  sourceType: string;
  isActive: boolean;
}) {
  if (!document.isActive) {
    return false;
  }

  const monitoredSourceNames = new Set(MONITORED_SOURCE_SEEDS.map((seed) => seed.sourceName));
  const monitoredSourceTypes = new Set([
    'MSD_CATALOGUE',
    'NEMLIT',
    'WHO_EML',
    'WHO_MODEL_FORMULARY',
    'STG',
    'ADDENDUM',
    'SMPC',
    'BNF',
  ]);

  return monitoredSourceNames.has(document.sourceName) || monitoredSourceTypes.has(document.sourceType);
}

async function probeSource(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    const headers = {
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
    };
    const fingerprintPayload = {
      url: response.url,
      status: response.status,
      headers,
    };

    return {
      ok: true,
      status: response.status,
      finalUrl: response.url,
      headers,
      fingerprint: JSON.stringify(fingerprintPayload),
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Source check failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSourceSyncCheck(triggeredBy?: string | null) {
  const existingDocuments = await prisma.sourceDocument.findMany({
    select: {
      id: true,
      sourceName: true,
      title: true,
      url: true,
      sourceType: true,
      isActive: true,
      documentVersion: true,
      lastCheckedAt: true,
      checksum: true,
    },
  });

  const documentByKey = new Map(
    existingDocuments.map((document) => [`${document.sourceName}::${document.title}`, document]),
  );

  const plannedChanges: PlannedChange[] = [];
  const monitoredKeys = new Set(MONITORED_SOURCE_SEEDS.map((seed) => `${seed.sourceName}::${seed.title}`));

  for (const seed of MONITORED_SOURCE_SEEDS) {
    const key = `${seed.sourceName}::${seed.title}`;
    const existing = documentByKey.get(key);

    if (!existing) {
      plannedChanges.push({ kind: 'NEW_SOURCE', seed });
      continue;
    }

    const probe = await probeSource(seed.url);
    if (!probe.ok) {
      plannedChanges.push({
        kind: 'SOURCE_CHECK_FAILED',
        seed,
        existing: {
          id: existing.id,
          url: existing.url,
          checksum: existing.checksum,
          lastCheckedAt: existing.lastCheckedAt,
        },
        message: probe.message,
      });
      continue;
    }

    let snapshot: SourceSnapshot;
    try {
      snapshot = await buildSourceSnapshot(existing.id, seed);
    } catch (error: any) {
      plannedChanges.push({
        kind: 'SOURCE_CHECK_FAILED',
        seed,
        existing: {
          id: existing.id,
          url: existing.url,
          checksum: existing.checksum,
          lastCheckedAt: existing.lastCheckedAt,
        },
        message: error?.message
          ? `Source snapshot failed: ${error.message}`
          : 'Source snapshot failed during source-sync reconciliation.',
      });
      continue;
    }

    const metadataChanged =
      existing.url !== probe.finalUrl ||
      existing.checksum !== probe.fingerprint ||
      existing.documentVersion !== (seed.documentVersion ?? null) ||
      snapshot.requiresReview;

    plannedChanges.push({
      kind: metadataChanged ? 'SOURCE_METADATA_UPDATED' : 'SOURCE_UNCHANGED',
      seed,
      existing: {
        id: existing.id,
        url: existing.url,
        checksum: existing.checksum,
        documentVersion: existing.documentVersion,
        lastCheckedAt: existing.lastCheckedAt,
      },
      probe,
      snapshot,
    });
  }

  for (const existing of existingDocuments) {
    const key = `${existing.sourceName}::${existing.title}`;
    if (monitoredKeys.has(key) || !isMonitoredDocumentCandidate(existing)) {
      continue;
    }

    plannedChanges.push({
      kind: 'SOURCE_NOT_MONITORED',
      existing: {
        id: existing.id,
        sourceName: existing.sourceName,
        title: existing.title,
        url: existing.url,
        sourceType: existing.sourceType,
        isActive: existing.isActive,
        checksum: existing.checksum,
        documentVersion: existing.documentVersion,
        lastCheckedAt: existing.lastCheckedAt,
      },
    });
  }

  const changesDetected = plannedChanges.filter((change) => change.kind !== 'SOURCE_UNCHANGED').length;

  const syncRun = await withPrismaRetry(() => prisma.sourceSyncRun.create({
    data: {
      id: randomUUID(),
      triggeredBy: triggeredBy || null,
      status: SourceSyncStatus.STARTED,
      notes: 'Source sync check started from the Phase 8 update pipeline.',
    },
  }));

  try {
    for (const change of plannedChanges) {
      if (change.kind === 'NEW_SOURCE') {
        await withPrismaRetry(() => prisma.sourceSyncChange.create({
          data: {
            syncRunId: syncRun.id,
            changeType: SourceSyncChangeType.NEW_SOURCE,
            summary: `Monitored source "${change.seed.title}" is not yet registered in source_documents.`,
            nextValue: toInputJson(change.seed),
          },
        }));
        continue;
      }

      if (change.kind === 'SOURCE_NOT_MONITORED') {
        await withPrismaRetry(() => prisma.sourceSyncChange.create({
          data: {
            syncRunId: syncRun.id,
            sourceDocumentId: change.existing.id,
            changeType: SourceSyncChangeType.SOURCE_NOT_MONITORED,
            summary: `Source document "${change.existing.title}" is active in source_documents but is no longer part of the monitored source list.`,
            previousValue: toInputJson({
              sourceName: change.existing.sourceName,
              title: change.existing.title,
              sourceType: change.existing.sourceType,
              url: change.existing.url,
              checksum: change.existing.checksum,
              documentVersion: change.existing.documentVersion,
              lastCheckedAt: change.existing.lastCheckedAt?.toISOString() ?? null,
            }),
          },
        }));
        continue;
      }

      if (change.kind === 'SOURCE_CHECK_FAILED') {
        await withPrismaRetry(() => prisma.sourceSyncChange.create({
          data: {
            syncRunId: syncRun.id,
            sourceDocumentId: change.existing.id,
            changeType: SourceSyncChangeType.SOURCE_CHECK_FAILED,
            summary: change.message,
            previousValue: toInputJson({
              url: change.existing.url,
              checksum: change.existing.checksum,
              lastCheckedAt: change.existing.lastCheckedAt?.toISOString() ?? null,
            }),
          },
        }));
        continue;
      }

      await withPrismaRetry(() => prisma.sourceDocument.update({
        where: { id: change.existing.id },
        data: {
          url: change.probe.finalUrl,
          documentVersion: change.seed.documentVersion ?? change.existing.documentVersion,
          checksum: change.probe.fingerprint,
          lastCheckedAt: new Date(),
        },
      }));

      await withPrismaRetry(() => prisma.sourceSyncChange.create({
        data: {
          syncRunId: syncRun.id,
          sourceDocumentId: change.existing.id,
          changeType: change.kind === 'SOURCE_METADATA_UPDATED'
            ? SourceSyncChangeType.SOURCE_METADATA_UPDATED
            : SourceSyncChangeType.SOURCE_UNCHANGED,
          summary: change.kind === 'SOURCE_METADATA_UPDATED'
            ? change.snapshot.requiresReview
              ? `Source reconciliation detected drift for "${change.seed.title}".`
              : `Source metadata changed for "${change.seed.title}".`
            : `No metadata change detected for "${change.seed.title}".`,
          previousValue: toInputJson({
            url: change.existing.url,
            checksum: change.existing.checksum,
            documentVersion: change.existing.documentVersion,
            lastCheckedAt: change.existing.lastCheckedAt?.toISOString() ?? null,
          }),
          nextValue: toInputJson({
            url: change.probe.finalUrl,
            checksum: change.probe.fingerprint,
            documentVersion: change.seed.documentVersion ?? change.existing.documentVersion ?? null,
            status: change.probe.status,
            headers: change.probe.headers,
            snapshot: change.snapshot,
          }),
        },
      }));
    }

    return withPrismaRetry(() => prisma.sourceSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SourceSyncStatus.COMPLETED,
        finishedAt: new Date(),
        sourcesChecked: MONITORED_SOURCE_SEEDS.length,
        changesDetected,
        notes: changesDetected > 0
          ? `Completed with ${changesDetected} source change(s) requiring review.`
          : 'Completed with no source metadata changes detected.',
      },
      include: {
        changes: {
          orderBy: { createdAt: 'desc' },
          include: {
            sourceDocument: {
              select: {
                id: true,
                sourceName: true,
                title: true,
                url: true,
              },
            },
          },
        },
      },
    }));
  } catch (error: any) {
    await withPrismaRetry(() => prisma.sourceSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SourceSyncStatus.FAILED,
        finishedAt: new Date(),
        sourcesChecked: MONITORED_SOURCE_SEEDS.length,
        changesDetected: 0,
        notes: error?.message
          ? `Source sync failed: ${error.message}`
          : 'Source sync failed before the update report completed.',
      },
    }));
    throw error;
  }
}

export async function listSourceSyncRuns(limit = 20) {
  const take = Math.min(Math.max(limit, 1), 100);
  return prisma.sourceSyncRun.findMany({
    take,
    orderBy: { startedAt: 'desc' },
    include: {
      changes: {
        orderBy: { createdAt: 'desc' },
        include: {
          sourceDocument: {
            select: {
              id: true,
              sourceName: true,
              title: true,
              url: true,
            },
          },
        },
      },
    },
  });
}
