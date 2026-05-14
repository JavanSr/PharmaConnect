import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { ClinicalSafetyAgent } from './clinical-safety.agent';
import { InventoryDemandAgent } from './inventory-demand.agent';
import { ComplianceAgent } from './compliance.agent';
import { BusinessIntelAgent } from './business-intel.agent';
import { DataCurationAgent } from './data-curation.agent';
import type { AgentTask, AgentType, AgentResult, OrchestratorResponse } from './types';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;

const ROUTING_PROMPT = `You are the APOTEKH Orchestrator. Classify a pharmacy query into one or more specialist agents.

Agents:
- clinical_safety: drug interactions, contraindications, G6PD, dose safety, patient safety
- inventory_demand: stock levels, FEFO, expiry, reorder, dead stock, stockout risk, demand forecast
- compliance: TMDA licences, PIC credentials, ADR reports, inspection scores, regulatory deadlines
- business_intel: churn risk, trial conversion, engagement, dispensing revenue, platform analytics
- data_curation: drug database validation, TMDA registration, recall broadcasts, source sync, data quality

Return JSON only:
{
  "primaryAgent": "<agent_type>",
  "supportingAgents": [],
  "reasoning": "<one sentence>"
}

Rules:
- supportingAgents must be empty or contain at most 2 agents different from primaryAgent
- Only add supportingAgents if the query genuinely spans multiple domains
- Clinical safety queries with patient risk = always primaryAgent clinical_safety`;

interface RoutingDecision {
  primaryAgent: AgentType;
  supportingAgents: AgentType[];
  reasoning: string;
}

function makeTask(query: string, context: AgentTask['context'], priority: AgentTask['priority']): AgentTask {
  return { id: randomUUID(), query, context, priority };
}

export class OrchestratorAgent {
  private client: Anthropic;

  private agentMap: Record<AgentType, () => InstanceType<typeof ClinicalSafetyAgent | typeof InventoryDemandAgent | typeof ComplianceAgent | typeof BusinessIntelAgent | typeof DataCurationAgent>>;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.agentMap = {
      clinical_safety: () => new ClinicalSafetyAgent(),
      inventory_demand: () => new InventoryDemandAgent(),
      compliance: () => new ComplianceAgent(),
      business_intel: () => new BusinessIntelAgent(),
      data_curation: () => new DataCurationAgent(),
      orchestrator: () => { throw new Error('Cannot delegate to orchestrator'); },
    };
  }

  async run(
    query: string,
    context: AgentTask['context'],
    priority: AgentTask['priority'] = 'normal',
  ): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const taskId = randomUUID();

    const routing = await this.classify(query);

    const primaryTask = makeTask(query, context, priority);
    const primaryAgent = this.agentMap[routing.primaryAgent]();
    const primaryResult = await primaryAgent.run(primaryTask);

    let supportingResults: AgentResult[] = [];
    if (routing.supportingAgents.length > 0) {
      supportingResults = await Promise.all(
        routing.supportingAgents.map(async (agentType) => {
          const task = makeTask(query, context, priority);
          const agent = this.agentMap[agentType]();
          return agent.run(task);
        }),
      );
    }

    const allResults = [primaryResult, ...supportingResults];
    const requiresHumanReview = allResults.some((r) => r.requiresHumanReview);
    const confidence = allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length;

    const finalAnswer = supportingResults.length > 0
      ? this.synthesize(primaryResult, supportingResults)
      : primaryResult.answer;

    return {
      taskId,
      query,
      routing: {
        primaryAgent: routing.primaryAgent,
        supportingAgents: routing.supportingAgents,
        reasoning: routing.reasoning,
      },
      results: allResults,
      finalAnswer,
      confidence: +confidence.toFixed(2),
      requiresHumanReview,
      processingTimeMs: Date.now() - startTime,
    };
  }

  private async classify(query: string): Promise<RoutingDecision> {
    const defaults: RoutingDecision = {
      primaryAgent: 'inventory_demand',
      supportingAgents: [],
      reasoning: 'Default routing — classification failed',
    };

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: ROUTING_PROMPT,
        messages: [{ role: 'user', content: query }],
      });

      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') return defaults;

      const match = text.text.match(/\{[\s\S]*\}/);
      if (!match) return defaults;

      const parsed = JSON.parse(match[0]) as Partial<RoutingDecision>;

      const validTypes: AgentType[] = ['clinical_safety', 'inventory_demand', 'compliance', 'business_intel', 'data_curation'];

      const primaryAgent = validTypes.includes(parsed.primaryAgent as AgentType)
        ? (parsed.primaryAgent as AgentType)
        : defaults.primaryAgent;

      const supportingAgents = Array.isArray(parsed.supportingAgents)
        ? (parsed.supportingAgents as string[]).filter(
            (t): t is AgentType => validTypes.includes(t as AgentType) && t !== primaryAgent,
          ).slice(0, 2)
        : [];

      return {
        primaryAgent,
        supportingAgents,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : defaults.reasoning,
      };
    } catch {
      return defaults;
    }
  }

  private synthesize(primary: AgentResult, supporting: AgentResult[]): string {
    const parts = [`Primary (${primary.agentType}): ${primary.answer}`];
    for (const s of supporting) {
      parts.push(`Additional (${s.agentType}): ${s.answer}`);
    }
    return parts.join('\n\n');
  }
}
