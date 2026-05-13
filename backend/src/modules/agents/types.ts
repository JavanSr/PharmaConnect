import type Anthropic from '@anthropic-ai/sdk';

export type AgentType =
  | 'orchestrator'
  | 'clinical_safety'
  | 'inventory_demand'
  | 'compliance'
  | 'business_intel'
  | 'data_curation';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface AgentTaskContext {
  pharmacyId?: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agentType?: AgentType;
  query: string;
  context: AgentTaskContext;
  priority: TaskPriority;
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  answer: string;
  confidence: number;
  reasoning: string;
  toolsUsed: string[];
  retries: number;
  processingTimeMs: number;
  requiresHumanReview: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrchestratorResponse {
  taskId: string;
  query: string;
  routing: {
    primaryAgent: AgentType;
    supportingAgents: AgentType[];
    reasoning: string;
  };
  results: AgentResult[];
  finalAnswer: string;
  confidence: number;
  requiresHumanReview: boolean;
  processingTimeMs: number;
}

export type AgentTool = Anthropic.Tool;

export interface ParsedAgentResponse {
  answer: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}
