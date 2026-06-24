import Anthropic from '@anthropic-ai/sdk';
import type { AgentTask, AgentResult, AgentType, AgentTool, ParsedAgentResponse } from './types';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const MAX_RETRIES = 3;
const MAX_TOOL_ITERATIONS = 12;

export abstract class BaseAgent {
  protected client: Anthropic;
  protected abstract agentType: AgentType;
  protected abstract systemPrompt: string;
  protected abstract tools: AgentTool[];

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  protected abstract executeToolCall(
    toolName: string,
    input: Record<string, unknown>,
    context: AgentTask['context'],
  ): Promise<unknown>;

  async run(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= MAX_RETRIES) {
      try {
        const result = await this.runLoop(task);
        result.retries = retries;
        result.processingTimeMs = Date.now() - startTime;
        return result;
      } catch (err) {
        lastError = err as Error;
        // 4xx errors from the Anthropic API are non-retryable: bad request,
        // invalid API key, or content policy. Retrying wastes seconds and quota.
        const status = (err as any)?.status ?? (err as any)?.statusCode;
        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          break;
        }
        retries++;
        if (retries <= MAX_RETRIES) {
          const delay = Math.min(500 * Math.pow(2, retries) + Math.random() * 300, 8000);
          await new Promise((r) => setTimeout(r, delay));
          console.warn(`[agent.retry] ${this.agentType} attempt ${retries}/${MAX_RETRIES}`, {
            error: lastError.message,
          });
        }
      }
    }

    return {
      taskId: task.id,
      agentType: this.agentType,
      answer: `Agent unavailable after ${MAX_RETRIES} retries: ${lastError?.message ?? 'unknown error'}`,
      confidence: 0,
      reasoning: 'All retry attempts exhausted',
      toolsUsed: [],
      retries,
      processingTimeMs: Date.now() - startTime,
      requiresHumanReview: true,
    };
  }

  private async runLoop(task: AgentTask): Promise<AgentResult> {
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: this.buildPrompt(task) },
    ];

    const toolsUsed: string[] = [];
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: this.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ] as Anthropic.Messages.TextBlockParam[],
        messages,
        tools: this.tools,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text');
        const raw = textBlock?.type === 'text' ? textBlock.text : '';
        const parsed = this.parseResponse(raw);
        return {
          taskId: task.id,
          agentType: this.agentType,
          answer: parsed.answer,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning,
          toolsUsed,
          retries: 0,
          processingTimeMs: 0,
          requiresHumanReview: parsed.confidence < 0.5,
          metadata: parsed.metadata,
        };
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          toolsUsed.push(block.name);

          try {
            const data = await this.executeToolCall(
              block.name,
              block.input as Record<string, unknown>,
              task.context,
            );
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(data),
            });
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: (err as Error).message }),
              is_error: true,
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    return {
      taskId: task.id,
      agentType: this.agentType,
      answer: 'Agent reached maximum iterations without a conclusion',
      confidence: 0.3,
      reasoning: `Stopped after ${MAX_TOOL_ITERATIONS} tool iterations`,
      toolsUsed,
      retries: 0,
      processingTimeMs: 0,
      requiresHumanReview: true,
    };
  }

  private buildPrompt(task: AgentTask): string {
    const lines: string[] = [
      `Task ID: ${task.id}`,
      `Priority: ${task.priority}`,
    ];
    if (task.context.pharmacyId) lines.push(`Pharmacy ID: ${task.context.pharmacyId}`);
    if (task.context.userRole) lines.push(`User Role: ${task.context.userRole}`);
    if (task.context.metadata) lines.push(`Context: ${JSON.stringify(task.context.metadata)}`);
    lines.push('');
    lines.push(`Query: ${task.query}`);
    lines.push('');
    lines.push(
      'After using tools to gather data, respond with a JSON object: ' +
        '{ "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }',
    );
    return lines.join('\n');
  }

  protected parseResponse(text: string): ParsedAgentResponse {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return {
          answer: typeof obj.answer === 'string' ? obj.answer : text,
          confidence: typeof obj.confidence === 'number' ? Math.min(1, Math.max(0, obj.confidence)) : 0.7,
          reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
          metadata: typeof obj.metadata === 'object' ? obj.metadata : undefined,
        };
      }
    } catch {
      // fall through
    }
    return { answer: text, confidence: 0.7, reasoning: 'Unstructured response' };
  }
}
