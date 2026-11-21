import { describe, expect, it } from 'vitest';
import { createDemoRepository } from '@/data/demo/demoRepository';
import { createDemoState } from '@/data/demo/seed';
import { runTurn } from './engine';
import { toolSpecs, TOOLS } from './tools';
import type { AssistantContext, ReasoningRequest, ReasoningResponse, Reasoner, ToolCall } from './types';

const TODAY = new Date().toISOString().slice(0, 10);
const context: AssistantContext = { today: TODAY, localTime: '18:00', timezone: 'UTC', currency: 'USD', weightUnit: 'kg', displayName: null };

/** A scripted stand-in for the model: returns the given responses in order and records requests. */
function scripted(...responses: ((req: ReasoningRequest) => ReasoningResponse)[]) {
  const requests: ReasoningRequest[] = [];
  const reasoner: Reasoner = {
    status: async () => ({ kind: 'connected', model: 'test' }),
    complete: async (req) => {
      requests.push(structuredClone(req));
      const next = responses.shift();
      if (!next) throw new Error('No more scripted responses');
      return next(req);
    },
  };
  return { reasoner, requests };
}
const call = (name: string, args: unknown, id = name): ToolCall => ({ id, name, arguments: JSON.stringify(args) });
const toolsSay = (...calls: ToolCall[]) => () => ({ content: null, toolCalls: calls });
const say = (text: string) => () => ({ content: text, toolCalls: [] });
const lastToolResult = (req: ReasoningRequest) => JSON.parse([...req.messages].reverse().find((m) => m.role === 'tool')!.content as string);

function setup() {
  const repo = createDemoRepository({ latencyMs: 0, state: createDemoState(TODAY) });
  return { repo, signal: new AbortController().signal, confirm: async () => true };
}

describe('assistant tools', () => {
  it('exposes every tool to the model with a JSON schema', () => {
    const specs = toolSpecs();
    expect(specs).toHaveLength(TOOLS.length);
    for (const s of specs) {
      expect(s.parameters).toMatchObject({ type: 'object' });
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.name).toMatch(/^[a-z_]+$/);
    }
  });
});

describe('runTurn', () => {
  it('logs weight from a natural-language request', async () => {
    const env = setup();
    const { reasoner } = scripted(toolsSay(call('log_weight', { value: 91.5, unit: 'kg' })), (req) => {
      expect(lastToolResult(req)).toMatchObject({ ok: true, data: { value: 91.5, unit: 'kg' } });
      return { content: 'Logged 91.5 kg.', toolCalls: [] };
    });
    const result = await runTurn({ ...env, reasoner, context, history: [], userText: 'Log my weight as 91.5 kg' });
    expect(result.text).toBe('Logged 91.5 kg.');
    expect(result.actions).toEqual([{ capability: 'log_weight', summary: 'Logged weight 91.5 kg', ok: true }]);
    expect((await env.repo.weight.list({ limit: 1 }))[0]).toMatchObject({ value: 91.5 });
  });

  it('records an expense in another currency', async () => {
    const env = setup();
    const { reasoner } = scripted(toolsSay(call('record_expense', { amount: 500, category: 'Groceries', currency: 'INR' })), say('Done.'));
    const result = await runTurn({ ...env, reasoner, context, history: [], userText: 'Add a ₹500 expense for groceries' });
    expect(result.actions[0]).toMatchObject({ capability: 'record_expense', ok: true });
    expect((await env.repo.expenses.list({ limit: 1 }))[0]).toMatchObject({ amount: 500, currency: 'INR', category: 'Groceries' });
  });

  it('creates a task for tomorrow', async () => {
    const env = setup();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const { reasoner } = scripted(toolsSay(call('create_task', { title: 'Finish my presentation', dueDate: tomorrow })), say('Added.'));
    await runTurn({ ...env, reasoner, context, history: [], userText: 'Create a task to finish my presentation tomorrow' });
    expect((await env.repo.tasks.search('presentation'))[0]).toMatchObject({ dueDate: tomorrow, completedAt: null });
  });

  it('waits for confirmation and does nothing when declined', async () => {
    const env = setup();
    const goal = (await env.repo.goals.list({ domain: 'physical' }))[0]!;
    const asked: string[] = [];
    const { reasoner } = scripted(toolsSay(call('update_goal', { goalId: goal.id, currentValue: 70 })), (req) => {
      expect(lastToolResult(req)).toMatchObject({ status: 'declined_by_user' });
      return { content: 'Okay, left it as is.', toolCalls: [] };
    });
    const result = await runTurn({
      ...env,
      reasoner,
      context,
      history: [],
      userText: 'Set my weight goal progress to 70',
      confirm: async (p) => {
        asked.push(p.description);
        return false;
      },
    });
    expect(asked[0]).toContain('progress to 70');
    expect(result.actions[0]).toMatchObject({ ok: false });
    expect((await env.repo.goals.list({ domain: 'physical' }))[0]!.currentValue).toBe(goal.currentValue);
  });

  it('applies a confirmed change', async () => {
    const env = setup();
    const goal = (await env.repo.goals.list({ domain: 'intellectual' }))[0]!;
    const { reasoner } = scripted(toolsSay(call('update_goal', { goalId: goal.id, currentValue: goal.currentValue + 1 })), say('Updated.'));
    await runTurn({ ...env, reasoner, context, history: [], userText: 'I finished another book' });
    expect((await env.repo.goals.list({ domain: 'intellectual' })).find((g) => g.id === goal.id)!.currentValue).toBe(goal.currentValue + 1);
  });

  it('returns validation errors to the model instead of writing bad data', async () => {
    const env = setup();
    const before = (await env.repo.weight.list()).length;
    const { reasoner } = scripted(toolsSay(call('log_weight', { value: -3 })), (req) => {
      expect(lastToolResult(req).error).toMatch(/Invalid arguments/);
      return { content: 'That weight doesn’t look right.', toolCalls: [] };
    });
    await runTurn({ ...env, reasoner, context, history: [], userText: 'log -3' });
    expect((await env.repo.weight.list()).length).toBe(before);
  });

  it('answers retrieval questions from real data', async () => {
    const env = setup();
    const { reasoner } = scripted(toolsSay(call('get_finances', { period: 'last_30_days' }), call('get_weight', { days: 30 })), (req) => {
      const results = req.messages.filter((m) => m.role === 'tool').map((m) => JSON.parse(m.content as string));
      expect(results[0].data.spent).toBeGreaterThan(0);
      expect(results[0].data.byCategory.length).toBeGreaterThan(0);
      expect(results[1].data.latest.unit).toBe('kg');
      return { content: 'Summary', toolCalls: [] };
    });
    const result = await runTurn({ ...env, reasoner, context, history: [], userText: 'How much did I spend and what do I weigh?' });
    expect(result.actions).toHaveLength(0);
  });

  it('reviews the week', async () => {
    const env = setup();
    const { reasoner } = scripted(toolsSay(call('get_period_review', { period: 'week', which: 'previous' })), (req) => {
      const r = lastToolResult(req).data;
      expect(r.days).toBe(7);
      expect(r.habits.overallRate).toBeGreaterThan(0);
      expect(Object.keys(r.domains)).toHaveLength(7);
      return { content: 'Review', toolCalls: [] };
    });
    await runTurn({ ...env, reasoner, context, history: [], userText: 'How consistent was I last week?' });
  });

  it('reports unknown tools and bad JSON without crashing', async () => {
    const env = setup();
    const { reasoner } = scripted(
      () => ({ content: null, toolCalls: [{ id: 'a', name: 'drop_tables', arguments: '{}' }, { id: 'b', name: 'log_weight', arguments: '{oops' }] }),
      (req) => {
        const results = req.messages.filter((m) => m.role === 'tool').map((m) => JSON.parse(m.content as string));
        expect(results[0].error).toMatch(/Unknown tool/);
        expect(results[1].error).toMatch(/not valid JSON/);
        return { content: 'Sorry.', toolCalls: [] };
      },
    );
    await runTurn({ ...env, reasoner, context, history: [], userText: 'x' });
  });

  it('passes conversation history and context to the model', async () => {
    const env = setup();
    const { reasoner, requests } = scripted(say('Hi'));
    await runTurn({ ...env, reasoner, context, history: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'reply' }], userText: 'now' });
    expect(requests[0]!.messages.map((m) => m.content)).toEqual(['earlier', 'reply', 'now']);
    expect(requests[0]!.context.currency).toBe('USD');
    expect(requests[0]!.tools.length).toBe(TOOLS.length);
  });

  it('stops when interrupted', async () => {
    const env = setup();
    const ac = new AbortController();
    const { reasoner } = scripted(() => {
      ac.abort();
      return { content: null, toolCalls: [call('log_weight', { value: 80 })] };
    });
    await expect(runTurn({ ...env, signal: ac.signal, reasoner, context, history: [], userText: 'x' })).rejects.toThrow(/Abort/);
    expect((await env.repo.weight.list({ limit: 1 }))[0]!.value).not.toBe(80);
  });
});
