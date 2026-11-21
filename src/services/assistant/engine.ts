import type { Repository } from '@/data/repository';
import type { ActionRecord } from '@/domain/types';
import { findTool, toolSpecs, type ToolContext } from './tools';
import type { AssistantContext, ModelMessage, Reasoner, ToolCall } from './types';

export interface PendingConfirmation {
  id: string;
  tool: string;
  description: string;
}

export interface TurnOptions {
  reasoner: Reasoner;
  repo: Repository;
  context: AssistantContext;
  /** Earlier turns of this conversation (text only). */
  history: ModelMessage[];
  userText: string;
  signal: AbortSignal;
  /** Asks the user to approve a consequential change. Resolves false if they decline. */
  confirm(pending: PendingConfirmation): Promise<boolean>;
  /** Called when a tool starts, e.g. to show "Checking your finances…". */
  onTool?(name: string): void;
  maxSteps?: number;
}

export interface TurnResult {
  text: string;
  actions: ActionRecord[];
  demo?: boolean;
}

const MAX_TOOL_RESULT = 8000;

function abortIfNeeded(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
}

/**
 * One assistant turn: the model may call tools (read or write the user's data through the
 * Repository) several times before answering. Writes flagged as consequential wait for the
 * user's confirmation; declined or failed actions are reported back to the model honestly.
 */
export async function runTurn(opts: TurnOptions): Promise<TurnResult> {
  const { reasoner, repo, context, signal } = opts;
  const toolContext: ToolContext = { today: context.today, currency: context.currency, weightUnit: context.weightUnit };
  const messages: ModelMessage[] = [...opts.history, { role: 'user', content: opts.userText }];
  const actions: ActionRecord[] = [];
  const tools = toolSpecs();
  const maxSteps = opts.maxSteps ?? 6;

  for (let step = 0; step < maxSteps; step++) {
    abortIfNeeded(signal);
    const response = await reasoner.complete({ messages, tools, context }, signal);
    if (response.demo) return { text: response.content ?? '', actions, demo: true };
    if (response.toolCalls.length === 0) {
      return { text: response.content?.trim() || 'I don’t have anything to add to that.', actions };
    }
    messages.push({ role: 'assistant', content: response.content, tool_calls: response.toolCalls });
    for (const call of response.toolCalls) {
      abortIfNeeded(signal);
      const output = await execute(call, repo, toolContext, opts, actions);
      const content = JSON.stringify(output);
      messages.push({ role: 'tool', tool_call_id: call.id, content: content.length > MAX_TOOL_RESULT ? `${content.slice(0, MAX_TOOL_RESULT)}…(truncated)` : content });
    }
  }
  return {
    text: actions.length
      ? `I made these changes but couldn’t finish the rest: ${actions.map((a) => a.summary).join('; ')}.`
      : 'That took more steps than I can handle at once. Could you break it into smaller requests?',
    actions,
  };
}

async function execute(call: ToolCall, repo: Repository, ctx: ToolContext, opts: TurnOptions, actions: ActionRecord[]): Promise<unknown> {
  const tool = findTool(call.name);
  if (!tool) return { error: `Unknown tool "${call.name}"` };

  let raw: unknown;
  try {
    raw = JSON.parse(call.arguments || '{}');
  } catch {
    return { error: 'Arguments were not valid JSON' };
  }
  const parsed = tool.schema.safeParse(raw);
  if (!parsed.success) {
    return { error: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join('.') || 'input'} ${i.message}`).join('; ')}` };
  }

  if (tool.confirm) {
    const description = tool.describe?.(parsed.data as never, ctx) ?? tool.description;
    const approved = await opts.confirm({ id: call.id, tool: tool.name, description });
    abortIfNeeded(opts.signal);
    if (!approved) {
      actions.push({ capability: tool.name, summary: `Not done: ${description}`, ok: false });
      return { status: 'declined_by_user', message: 'The user chose not to do this. Acknowledge briefly; do not retry unless asked.' };
    }
  }

  opts.onTool?.(tool.name);
  try {
    const outcome = await tool.run(repo, parsed.data as never, ctx);
    if (tool.mutates && outcome.summary) actions.push({ capability: tool.name, summary: outcome.summary, ok: true });
    return { ok: true, data: outcome.result };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    const message = error instanceof Error ? error.message : 'The action failed';
    if (tool.mutates) actions.push({ capability: tool.name, summary: `Failed: ${message}`, ok: false });
    return { error: message };
  }
}
