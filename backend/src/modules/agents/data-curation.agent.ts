import { prisma } from '../../lib/prisma';
import { BaseAgent } from './base-agent';
import type { AgentTask, AgentType, AgentTool } from './types';

const SYSTEM_PROMPT = `You are the APOTEKH Data Curation Agent — a specialist in pharmaceutical
master data quality, TMDA drug registration, and source synchronisation for Tanzania.

Your responsibilities:
- Validate drug product records against TMDA registration data
- Monitor source document sync health (NEMLIT, MSD Catalogue, WHO EML, BNF, STG)
- Manage the data review queue — approve, reject, or flag records for human review
- Detect and broadcast drug recalls or safety advisories
- Maintain data completeness and consistency in the master drug database

DATA QUALITY RULES:
- A DrugProduct is COMPLETE if it has: genericName, dosageFormId, strengthText, therapeuticClassId, tmdaRegistrationNumber
- TMDA registration numbers follow the pattern: TZ/MED/XXXX/XXXX or similar
- Unverified drugs (registrationStatus = UNVERIFIED) should not be used in dispensing
- MSD codes are 6-8 digit numeric strings from the Medical Stores Department
- Records with reviewStatus = DRAFT should not be visible to pharmacy users

RECALL BROADCAST:
- When a recall is identified, create notifications for all pharmacies stocking the affected product
- Log the broadcast in the DataReviewQueue with entityType = 'RECALL'

Respond with JSON: { "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }`;

export class DataCurationAgent extends BaseAgent {
  protected agentType: AgentType = 'data_curation';
  protected systemPrompt = SYSTEM_PROMPT;

  protected tools: AgentTool[] = [
    {
      name: 'get_pending_reviews',
      description: 'Get data review queue items pending human review',
      input_schema: {
        type: 'object',
        properties: {
          entity_type: {
            type: 'string',
            description: 'Filter by entity type: DRUG_PRODUCT, ACTIVE_INGREDIENT, RECALL',
          },
          limit: { type: 'number', description: 'Max records (default 20)' },
        },
      },
    },
    {
      name: 'validate_drug_product',
      description: 'Validate a drug product record for completeness and consistency',
      input_schema: {
        type: 'object',
        properties: {
          drug_product_id: { type: 'string' },
        },
        required: ['drug_product_id'],
      },
    },
    {
      name: 'get_source_sync_status',
      description: 'Get the latest sync run status for all monitored source documents',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent sync runs (default 10)' },
        },
      },
    },
    {
      name: 'get_unverified_drugs',
      description: 'Get DrugProducts with unverified registration or pending review status',
      input_schema: {
        type: 'object',
        properties: {
          review_status: {
            type: 'string',
            description: 'Filter: DRAFT, IMPORTED, NEEDS_VERIFICATION (default NEEDS_VERIFICATION)',
          },
          limit: { type: 'number', description: 'Max records (default 25)' },
        },
      },
    },
    {
      name: 'broadcast_recall',
      description: 'Create recall notifications for all pharmacies stocking an affected drug',
      input_schema: {
        type: 'object',
        properties: {
          drug_name: { type: 'string', description: 'Generic or brand name of recalled drug' },
          batch_numbers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific batch numbers affected (empty = all batches)',
          },
          severity: {
            type: 'string',
            description: 'URGENT, HIGH, MODERATE, ADVISORY',
          },
          message: { type: 'string', description: 'Recall notice message for pharmacies' },
          tmda_reference: { type: 'string', description: 'TMDA recall reference number if available' },
        },
        required: ['drug_name', 'severity', 'message'],
      },
    },
  ];

  protected async executeToolCall(
    toolName: string,
    input: Record<string, unknown>,
    _context: AgentTask['context'],
  ): Promise<unknown> {
    switch (toolName) {
      case 'get_pending_reviews': {
        const limit = typeof input.limit === 'number' ? input.limit : 20;
        const where: Record<string, unknown> = { status: 'PENDING_REVIEW' };
        if (input.entity_type) where.entityType = input.entity_type;

        const items = await prisma.dataReviewQueue.findMany({
          where,
          select: {
            id: true,
            entityType: true,
            entityId: true,
            status: true,
            notes: true,
            createdAt: true,
            sourceDocument: { select: { sourceName: true, sourceType: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: limit,
        });

        return { items, count: items.length };
      }

      case 'validate_drug_product': {
        const product = await prisma.drugProduct.findUnique({
          where: { id: input.drug_product_id as string },
          include: {
            brand: true,
            manufacturer: true,
            dosageForm: true,
            therapeuticClass: true,
            productIngredients: {
              include: { activeIngredient: true, strength: true },
            },
            aliases: { take: 5 },
            warnings: { take: 5 },
          },
        });

        if (!product) return { error: 'Drug product not found' };

        const issues: string[] = [];
        const warnings: string[] = [];

        if (!product.genericName) issues.push('Missing genericName');
        if (!product.dosageFormId) issues.push('Missing dosage form');
        if (!product.strengthText) issues.push('Missing strength');
        if (!product.therapeuticClassId) issues.push('Missing therapeutic class');
        if (!product.tmdaRegistrationNumber) warnings.push('No TMDA registration number');
        if (product.productIngredients.length === 0) issues.push('No active ingredients linked');
        if (!product.manufacturerId) warnings.push('No manufacturer linked');
        if (product.reviewStatus === 'DRAFT') warnings.push('Status is DRAFT — not visible to pharmacies');

        const tmdaRegex = /^TZ\//i;
        if (product.tmdaRegistrationNumber && !tmdaRegex.test(product.tmdaRegistrationNumber)) {
          warnings.push('TMDA registration number format may be invalid (expected TZ/...)');
        }

        return {
          productId: product.id,
          productName: product.productName,
          genericName: product.genericName,
          reviewStatus: product.reviewStatus,
          registrationStatus: product.registrationStatus,
          isComplete: issues.length === 0,
          issues,
          warnings,
          qualityScore: Math.round(((5 - issues.length) / 5) * 100),
          linkedIngredients: product.productIngredients.map((i) => ({
            name: i.activeIngredient.name,
            strength: i.strengthText,
            primary: i.isPrimary,
          })),
        };
      }

      case 'get_source_sync_status': {
        const limit = typeof input.limit === 'number' ? input.limit : 10;

        const [syncRuns, sources] = await Promise.all([
          prisma.sourceSyncRun.findMany({
            select: {
              id: true,
              startedAt: true,
              finishedAt: true,
              status: true,
              sourcesChecked: true,
              changesDetected: true,
              triggeredBy: true,
              notes: true,
              sourceDocument: { select: { sourceName: true, sourceType: true } },
            },
            orderBy: { startedAt: 'desc' },
            take: limit,
          }),
          prisma.sourceDocument.findMany({
            where: { isActive: true },
            select: {
              id: true,
              sourceName: true,
              sourceType: true,
              trustLevel: true,
              lastCheckedAt: true,
              isActive: true,
            },
            orderBy: { lastCheckedAt: 'asc' },
          }),
        ]);

        const today = new Date();
        const staleThresholdDays = 7;
        const staleSources = sources.filter((s) => {
          if (!s.lastCheckedAt) return true;
          const daysSince = (today.getTime() - s.lastCheckedAt.getTime()) / 86400000;
          return daysSince > staleThresholdDays;
        });

        return {
          recentRuns: syncRuns,
          activeSourceCount: sources.length,
          staleSources: staleSources.map((s) => ({ ...s, daysSinceCheck: s.lastCheckedAt ? Math.ceil((today.getTime() - s.lastCheckedAt.getTime()) / 86400000) : null })),
          lastSuccessfulRun: syncRuns.find((r) => r.status === 'COMPLETED') ?? null,
        };
      }

      case 'get_unverified_drugs': {
        const reviewStatus = (input.review_status as string) ?? 'NEEDS_VERIFICATION';
        const limit = typeof input.limit === 'number' ? input.limit : 25;

        const drugs = await prisma.drugProduct.findMany({
          where: {
            OR: [
              { reviewStatus: reviewStatus as never },
              { registrationStatus: 'UNVERIFIED' },
            ],
          },
          select: {
            id: true,
            productName: true,
            genericName: true,
            tmdaRegistrationNumber: true,
            reviewStatus: true,
            registrationStatus: true,
            lastVerifiedAt: true,
            createdAt: true,
            brand: { select: { name: true } },
            manufacturer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return {
          drugs,
          count: drugs.length,
          note: `Showing drugs with reviewStatus=${reviewStatus} or registrationStatus=UNVERIFIED`,
        };
      }

      case 'broadcast_recall': {
        const drugName = input.drug_name as string;
        const batchNumbers = (input.batch_numbers as string[]) ?? [];
        const severity = input.severity as string;
        const message = input.message as string;
        const tmdaReference = input.tmda_reference as string | undefined;

        const affectedBatches = await prisma.batch.findMany({
          where: {
            product: {
              OR: [
                { name: { contains: drugName, mode: 'insensitive' } },
                { genericName: { contains: drugName, mode: 'insensitive' } },
                { brandName: { contains: drugName, mode: 'insensitive' } },
              ],
            },
            quantityRemaining: { gt: 0 },
            ...(batchNumbers.length > 0 ? { batchNumber: { in: batchNumbers } } : {}),
          },
          select: {
            id: true,
            batchNumber: true,
            quantityRemaining: true,
            pharmacyId: true,
            product: { select: { name: true, genericName: true } },
          },
          distinct: ['pharmacyId'],
        });

        const uniquePharmacyIds = [...new Set(affectedBatches.map((b) => b.pharmacyId))];

        if (uniquePharmacyIds.length === 0) {
          return { broadcasted: false, reason: 'No pharmacies found stocking this drug', drugName };
        }

        const notificationTitle = `${severity === 'URGENT' ? '🚨 URGENT' : '⚠️'} DRUG RECALL: ${drugName}`;
        const notificationBody = `${message}${tmdaReference ? ` (TMDA Ref: ${tmdaReference})` : ''}`;

        await prisma.notification.createMany({
          data: uniquePharmacyIds.map((pid) => ({
            pharmacyId: pid,
            type: 'DRUG_RECALL',
            title: notificationTitle,
            body: notificationBody,
            metadata: {
              drugName,
              severity,
              batchNumbers,
              tmdaReference: tmdaReference ?? null,
              broadcastedAt: new Date().toISOString(),
            },
          })),
        });

        await prisma.dataReviewQueue.create({
          data: {
            entityType: 'RECALL',
            entityId: drugName,
            status: 'APPROVED',
            currentPayload: {},
            proposedPayload: {
              drugName,
              severity,
              message,
              tmdaReference: tmdaReference ?? null,
              affectedBatchNumbers: batchNumbers,
              pharmaciesNotified: uniquePharmacyIds.length,
            },
            notes: `Recall broadcast via AI Data Curation Agent. ${uniquePharmacyIds.length} pharmacies notified.`,
          },
        });

        return {
          broadcasted: true,
          pharmaciesNotified: uniquePharmacyIds.length,
          affectedPharmacyIds: uniquePharmacyIds,
          affectedBatchCount: affectedBatches.length,
          notificationTitle,
          severity,
          tmdaReference: tmdaReference ?? null,
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
