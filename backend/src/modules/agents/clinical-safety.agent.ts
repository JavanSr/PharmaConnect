import { prisma } from '../../lib/prisma';
import { BaseAgent } from './base-agent';
import type { AgentTask, AgentType, AgentTool } from './types';

const SYSTEM_PROMPT = `You are the APOTEKH Clinical Safety Agent — a specialist clinical pharmacist AI for
Tanzanian pharmacy practice. You follow the Tanzania Standard Treatment Guidelines (STG),
TMDA advisories, and WHO EML recommendations.

Your responsibilities:
- Drug-drug interaction checking (4 severity levels: CONTRAINDICATED, SEVERE, MODERATE, MINOR)
- Contraindication screening (pregnancy categories, renal/hepatic impairment, G6PD deficiency)
- Dose verification for adult and paediatric patients
- Special population flags (elderly, pregnancy, lactation, NCD patients)
- PIC PIN override audit and pattern analysis

CRITICAL RULES:
- CONTRAINDICATED interactions always require human review (requiresHumanReview: true)
- G6PD deficiency is common in Tanzania (est. 8-20% prevalence) — flag all relevant drugs
- Never invent drug interactions or contraindications not found in the database
- If drug data is missing, state so clearly and recommend consulting BNF/STG directly

Respond with JSON: { "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }`;

export class ClinicalSafetyAgent extends BaseAgent {
  protected agentType: AgentType = 'clinical_safety';
  protected systemPrompt = SYSTEM_PROMPT;

  protected tools: AgentTool[] = [
    {
      name: 'lookup_drug',
      description: 'Find a drug in the safety database by generic name or brand name',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Generic or brand name to search' },
        },
        required: ['name'],
      },
    },
    {
      name: 'check_drug_interactions',
      description: 'Get all interactions between a list of drug database IDs',
      input_schema: {
        type: 'object',
        properties: {
          drug_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of DrugDatabase IDs to check pairwise',
          },
        },
        required: ['drug_ids'],
      },
    },
    {
      name: 'check_contraindications',
      description: 'Get contraindications for a drug given patient conditions',
      input_schema: {
        type: 'object',
        properties: {
          drug_id: { type: 'string', description: 'DrugDatabase ID' },
          conditions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Condition types to filter (e.g. PREGNANCY, G6PD, RENAL, HEPATIC)',
          },
        },
        required: ['drug_id'],
      },
    },
    {
      name: 'check_special_populations',
      description: 'Get pregnancy/lactation/renal/hepatic safety flags for a drug',
      input_schema: {
        type: 'object',
        properties: {
          drug_id: { type: 'string', description: 'DrugDatabase ID' },
        },
        required: ['drug_id'],
      },
    },
    {
      name: 'get_override_history',
      description: 'Get PIC PIN override history for a pharmacy to spot patterns',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          limit: { type: 'number', description: 'Max records, default 20' },
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
    switch (toolName) {
      case 'lookup_drug': {
        const name = (input.name as string).toLowerCase();
        const drugs = await prisma.drugDatabase.findMany({
          where: {
            OR: [
              { genericName: { contains: name, mode: 'insensitive' } },
              { brandNames: { has: input.name as string } },
            ],
          },
          select: {
            id: true,
            genericName: true,
            brandNames: true,
            drugClass: true,
            therapeuticCategory: true,
            awarClass: true,
            pregnancyCategory: true,
            breastfeedingSafety: true,
            elderlyCaution: true,
            renalCaution: true,
            hepaticCaution: true,
            standardAdultDose: true,
            frequency: true,
            route: true,
            paediatricDoseFormula: true,
            ncdHints: true,
          },
          take: 5,
        });
        return drugs;
      }

      case 'check_drug_interactions': {
        const ids = input.drug_ids as string[];
        if (ids.length < 2) return { interactions: [], note: 'Need at least 2 drugs to check' };

        const interactions = await prisma.drugInteraction.findMany({
          where: {
            OR: ids.flatMap((a) =>
              ids
                .filter((b) => b !== a)
                .map((b) => ({ drugAId: a, drugBId: b })),
            ),
          },
          include: {
            drugA: { select: { id: true, genericName: true } },
            drugB: { select: { id: true, genericName: true } },
          },
          orderBy: [{ severity: 'asc' }],
        });
        return { interactions, count: interactions.length };
      }

      case 'check_contraindications': {
        const where: Record<string, unknown> = { drugId: input.drug_id };
        if (input.conditions && (input.conditions as string[]).length > 0) {
          where.conditionType = { in: input.conditions };
        }
        const contraindications = await prisma.drugContraindication.findMany({
          where,
          select: {
            id: true,
            conditionType: true,
            conditionValue: true,
            severity: true,
            message: true,
            requiresPicPin: true,
          },
          orderBy: { severity: 'asc' },
        });
        return { contraindications, count: contraindications.length };
      }

      case 'check_special_populations': {
        const drugId = input.drug_id as string;
        const [drug, pregnancyFlags, lactationFlags, renalFlags, hepaticFlags, warnings] =
          await Promise.all([
            prisma.drugDatabase.findUnique({
              where: { id: drugId },
              select: {
                genericName: true,
                pregnancyCategory: true,
                breastfeedingSafety: true,
                elderlyCaution: true,
                renalCaution: true,
                hepaticCaution: true,
                ncdHints: true,
              },
            }),
            prisma.pregnancyFlag.findMany({
              where: { drugDatabaseId: drugId, reviewStatus: { not: 'REJECTED' } },
              select: { trimester: true, riskLevel: true, message: true },
            }),
            prisma.lactationFlag.findMany({
              where: { drugDatabaseId: drugId, reviewStatus: { not: 'REJECTED' } },
              select: { riskLevel: true, message: true },
            }),
            prisma.renalFlag.findMany({
              where: { drugDatabaseId: drugId, reviewStatus: { not: 'REJECTED' } },
              select: { stage: true, severity: true, message: true },
            }),
            prisma.hepaticFlag.findMany({
              where: { drugDatabaseId: drugId, reviewStatus: { not: 'REJECTED' } },
              select: { stage: true, severity: true, message: true },
            }),
            prisma.warning.findMany({
              where: { drugDatabaseId: drugId, reviewStatus: { not: 'REJECTED' } },
              select: { warningType: true, severity: true, message: true },
            }),
          ]);

        return { drug, pregnancyFlags, lactationFlags, renalFlags, hepaticFlags, warnings };
      }

      case 'get_override_history': {
        const pharmacyId = (input.pharmacy_id as string) ?? context.pharmacyId;
        const limit = typeof input.limit === 'number' ? input.limit : 20;
        const overrides = await prisma.overrideLog.findMany({
          where: { pharmacyId },
          select: {
            id: true,
            alertType: true,
            reason: true,
            createdAt: true,
            interaction: {
              select: {
                severity: true,
                effectSummary: true,
                drugA: { select: { genericName: true } },
                drugB: { select: { genericName: true } },
              },
            },
            contraindication: {
              select: { conditionType: true, severity: true, message: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return { overrides, count: overrides.length };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
