import { prisma } from '../../lib/prisma';
import { BaseAgent } from './base-agent';
import type { AgentTask, AgentType, AgentTool } from './types';

const SYSTEM_PROMPT = `You are the APOTEKH Compliance & Regulatory Agent — a specialist in Tanzanian
pharmacy regulatory requirements including TMDA, Pharmacy Council (PC), and workplace safety.

Your responsibilities:
- Licence expiry monitoring (TMDA, PC, business licences)
- PIC (Pharmacist in Charge) credential validation
- Inspection readiness scoring against TMDA checklist
- Adverse Drug Reaction (ADR) report status tracking
- Staff credential expiry alerts

REGULATORY CONTEXT:
- TMDA regulates medicine registration and pharmacy premises
- Pharmacy Council (PC) licenses pharmacists and pharmaceutical technologists
- All pharmacies must have a licensed PIC at all times
- ADR reports are mandatory for serious reactions and must be filed with TMDA
- Licence renewal deadlines are non-negotiable — RED status = legal risk

STATUS LOGIC:
- GREEN: valid, >90 days to expiry
- AMBER: 30-90 days to expiry
- RED: <30 days to expiry or expired

Respond with JSON: { "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }`;

export class ComplianceAgent extends BaseAgent {
  protected agentType: AgentType = 'compliance';
  protected systemPrompt = SYSTEM_PROMPT;

  protected tools: AgentTool[] = [
    {
      name: 'get_compliance_health',
      description: 'Get overall compliance health summary for a pharmacy',
      input_schema: {
        type: 'object',
        properties: { pharmacy_id: { type: 'string' } },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_expiring_items',
      description: 'List compliance items expiring within N days',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          within_days: { type: 'number', description: 'Days ahead to look (default 90)' },
          category: {
            type: 'string',
            description: 'Filter by category: LICENCE, INSURANCE, EQUIPMENT, STAFF_CREDENTIAL',
          },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_staff_credentials',
      description: 'Get all staff credentials and their status for a pharmacy',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          include_expired: { type: 'boolean', description: 'Include already expired credentials' },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_adr_reports',
      description: 'Get Adverse Drug Reaction reports for a pharmacy',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          status: {
            type: 'string',
            description: 'Filter: DRAFT, SUBMITTED, ACKNOWLEDGED, CLOSED',
          },
          limit: { type: 'number', description: 'Max records (default 20)' },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_inspection_scores',
      description: 'Get recent TMDA inspection checklist scores for a pharmacy',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          limit: { type: 'number', description: 'Number of recent checklists (default 5)' },
        },
        required: ['pharmacy_id'],
      },
    },
  ];

  protected async executeToolCall(
    toolName: string,
    input: Record<string, unknown>,
    context: AgentTask['context'],
  ): Promise<unknown> {
    const pharmacyId = (input.pharmacy_id as string) ?? context.pharmacyId;

    switch (toolName) {
      case 'get_compliance_health': {
        const items = await prisma.complianceItem.findMany({
          where: { pharmacyId, isNotApplicable: false },
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            dueDate: true,
            renewalDate: true,
            licenceType: true,
            issuingBody: true,
          },
        });

        const statusCounts = items.reduce(
          (acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        const today = new Date();
        const overallHealth =
          (statusCounts.EXPIRED ?? 0) > 0
            ? 'CRITICAL'
            : (statusCounts.RED ?? 0) > 0
              ? 'AT_RISK'
              : (statusCounts.AMBER ?? 0) > 0
                ? 'ATTENTION_NEEDED'
                : 'HEALTHY';

        return {
          pharmacyId,
          overallHealth,
          statusCounts,
          totalItems: items.length,
          criticalItems: items.filter((i) => i.status === 'EXPIRED' || i.status === 'RED'),
          checkedAt: today.toISOString(),
        };
      }

      case 'get_expiring_items': {
        const withinDays = typeof input.within_days === 'number' ? input.within_days : 90;
        const future = new Date(Date.now() + withinDays * 86400000);

        const where: Record<string, unknown> = {
          pharmacyId,
          isNotApplicable: false,
          OR: [
            { dueDate: { lte: future } },
            { renewalDate: { lte: future } },
          ],
        };
        if (input.category) where.category = input.category;

        const items = await prisma.complianceItem.findMany({
          where,
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            dueDate: true,
            renewalDate: true,
            licenceType: true,
            issuingBody: true,
            referenceNumber: true,
          },
          orderBy: { dueDate: 'asc' },
        });

        const today = new Date();
        return items.map((item) => {
          const expiryDate = item.dueDate ?? item.renewalDate;
          const daysToExpiry = expiryDate
            ? Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000)
            : null;
          return { ...item, daysToExpiry, isExpired: daysToExpiry !== null && daysToExpiry < 0 };
        });
      }

      case 'get_staff_credentials': {
        const where: Record<string, unknown> = { pharmacyId };
        if (!input.include_expired) where.status = { not: 'EXPIRED' };

        const credentials = await prisma.staffCredential.findMany({
          where,
          select: {
            id: true,
            credentialName: true,
            credentialNumber: true,
            issuingBody: true,
            issuedAt: true,
            expiresAt: true,
            status: true,
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { expiresAt: 'asc' },
        });

        const today = new Date();
        return credentials.map((c) => ({
          ...c,
          daysToExpiry: c.expiresAt
            ? Math.ceil((c.expiresAt.getTime() - today.getTime()) / 86400000)
            : null,
        }));
      }

      case 'get_adr_reports': {
        const limit = typeof input.limit === 'number' ? input.limit : 20;
        const where: Record<string, unknown> = { pharmacyId };
        if (input.status) where.status = input.status;

        const reports = await prisma.adverseReactionReport.findMany({
          where,
          select: {
            id: true,
            suspectedDrug: true,
            reaction: true,
            seriousness: true,
            status: true,
            tmdaReferenceNo: true,
            submittedAt: true,
            createdAt: true,
            patientAgeYears: true,
            patientSex: true,
            outcome: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        const draftCount = await prisma.adverseReactionReport.count({
          where: { pharmacyId, status: 'DRAFT' },
        });

        return { reports, draftCount, total: reports.length };
      }

      case 'get_inspection_scores': {
        const limit = typeof input.limit === 'number' ? input.limit : 5;
        const checklists = await prisma.inspectionChecklist.findMany({
          where: { pharmacyId },
          select: {
            id: true,
            checklistType: true,
            scorePercentage: true,
            status: true,
            generatedAt: true,
            items: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: limit,
        });

        const trend =
          checklists.length >= 2
            ? checklists[0].scorePercentage - checklists[checklists.length - 1].scorePercentage
            : null;

        return {
          checklists: checklists.map((c) => ({
            ...c,
            items: undefined,
            itemCount: Array.isArray(c.items) ? (c.items as unknown[]).length : 0,
          })),
          latestScore: checklists[0]?.scorePercentage ?? null,
          trendPoints: trend,
          inspectionReady: (checklists[0]?.scorePercentage ?? 0) >= 80,
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
