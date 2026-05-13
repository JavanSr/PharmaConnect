import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { OrchestratorAgent } from './orchestrator.agent';
import type { AgentTask } from './types';

export const agentsRouter = Router();

const QuerySchema = z.object({
  query: z.string().min(3).max(2000),
  priority: z.enum(['critical', 'high', 'normal', 'low']).optional().default('normal'),
  context: z
    .object({
      pharmacyId: z.string().optional(),
      userId: z.string().optional(),
      userRole: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional()
    .default({}),
});

agentsRouter.get('/health', (_req: Request, res: Response) => {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  res.json({
    status: configured ? 'ok' : 'unconfigured',
    agents: ['clinical_safety', 'inventory_demand', 'compliance', 'business_intel', 'data_curation'],
    model: 'claude-sonnet-4-6',
    configured,
  });
});

agentsRouter.post('/query', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { query, priority, context } = parsed.data;

  // Merge auth context from JWT if available
  const authContext: AgentTask['context'] = {
    pharmacyId: (req as Request & { pharmacy?: { id: string } }).pharmacy?.id ?? context.pharmacyId,
    userId: (req as Request & { user?: { id: string } }).user?.id ?? context.userId,
    userRole: (req as Request & { user?: { role: string } }).user?.role ?? context.userRole,
    metadata: context.metadata,
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'AI agents are not configured on this server' });
    return;
  }

  try {
    const orchestrator = new OrchestratorAgent();
    const result = await orchestrator.run(query, authContext, priority);
    res.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents.query.error]', { error: message, query: query.slice(0, 100) });
    res.status(500).json({ error: 'Agent query failed', message });
  }
});
