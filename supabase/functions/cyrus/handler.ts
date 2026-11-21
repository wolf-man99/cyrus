/**
 * Request handling for the `cyrus` Edge Function, written without Deno globals so it can be
 * unit-tested. `index.ts` wires it to Deno.serve, Supabase Auth and the environment.
 *
 *   GET  /cyrus/status      → { ready, model, reason? }
 *   POST /cyrus/chat        → { content, tool_calls }   body: { messages, tools, context }
 *   POST /cyrus/transcribe  → { text }                  body: multipart/form-data with `audio`
 *   POST /cyrus/speech      → audio/mpeg                body: { text }
 *
 * Speech-to-text, reasoning and text-to-speech are separate endpoints so each can move to a
 * different provider (or a realtime API) on its own.
 */
import { z } from 'npm:zod@4';
import { systemPrompt } from './prompt.ts';

export interface HandlerConfig {
  openaiKey: string;
  openaiBaseUrl: string;
  chatModel: string;
  transcribeModel: string;
  ttsModel: string;
  ttsVoice: string;
  allowedOrigins: string[];
}

export interface HandlerDeps {
  /** Returns the user id for a valid session JWT, or null. */
  verifyUser(token: string): Promise<string | null>;
  fetch: typeof fetch;
  log?: (...args: unknown[]) => void;
}

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const toolCall = z.object({ id: z.string().max(100), name: z.string().regex(/^[a-z_]{1,64}$/), arguments: z.string().max(20000) });
const message = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), content: z.string().trim().min(1).max(4000) }),
  z.object({ role: z.literal('assistant'), content: z.string().max(8000).nullable(), tool_calls: z.array(toolCall).max(10).optional() }),
  z.object({ role: z.literal('tool'), tool_call_id: z.string().max(100), content: z.string().max(12000) }),
]);
const chatSchema = z.object({
  messages: z.array(message).min(1).max(80),
  tools: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z_]{1,64}$/),
        description: z.string().max(1000),
        parameters: z.record(z.string(), z.unknown()),
      }),
    )
    .max(40)
    .default([]),
  context: z.object({
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    localTime: z.string().max(40),
    timezone: z.string().max(64),
    currency: z.string().regex(/^[A-Z]{3}$/),
    weightUnit: z.enum(['kg', 'lb']),
    displayName: z.string().max(60).nullable(),
  }),
});
const speechSchema = z.object({ text: z.string().trim().min(1).max(1500) });

export function createHandler(config: HandlerConfig, deps: HandlerDeps) {
  const log = deps.log ?? (() => undefined);

  function corsHeaders(origin: string | null): Record<string, string> {
    const wildcard = config.allowedOrigins.includes('*');
    const allowed = wildcard ? '*' : origin && config.allowedOrigins.includes(origin) ? origin : 'null';
    return {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    };
  }

  const json = (body: unknown, status: number, origin: string | null) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

  /** Maps an upstream failure to a safe client-facing status. Details stay in the server log. */
  async function upstreamError(res: Response, origin: string | null): Promise<Response> {
    log('OpenAI error', res.status, await res.text().catch(() => ''));
    if (res.status === 429) return json({ error: 'Cyrus is busy right now. Try again in a moment.' }, 429, origin);
    if (res.status === 401 || res.status === 403) return json({ error: 'Cyrus AI is misconfigured on the server.' }, 503, origin);
    return json({ error: 'Cyrus couldn’t respond. Please try again.' }, 502, origin);
  }

  const openai = (path: string, init: RequestInit) =>
    deps.fetch(`${config.openaiBaseUrl}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${config.openaiKey}` } });

  return async function handle(req: Request): Promise<Response> {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    // Every endpoint requires a real signed-in user; the public anon key alone is rejected.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const userId = token ? await deps.verifyUser(token).catch(() => null) : null;
    if (!userId) return json({ error: 'Not signed in' }, 401, origin);

    const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();
    if (route === 'status') {
      return config.openaiKey
        ? json({ ready: true, model: config.chatModel }, 200, origin)
        : json({ ready: false, model: null, reason: 'Cyrus AI isn’t configured on the server yet.' }, 200, origin);
    }
    if (!config.openaiKey) return json({ error: 'Cyrus AI isn’t configured on the server yet.' }, 503, origin);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

    try {
      switch (route) {
        case 'chat': {
          const parsed = chatSchema.safeParse(await req.json().catch(() => null));
          if (!parsed.success) return json({ error: 'Invalid request' }, 400, origin);
          const { messages, tools, context } = parsed.data;
          const res = await openai('/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: config.chatModel,
              max_completion_tokens: 700,
              messages: [
                { role: 'system', content: systemPrompt(context) },
                ...messages.map((m) =>
                  m.role === 'assistant' && m.tool_calls?.length
                    ? { role: 'assistant', content: m.content, tool_calls: m.tool_calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })) }
                    : m,
                ),
              ],
              ...(tools.length
                ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: 'auto' }
                : {}),
            }),
          });
          if (!res.ok) return upstreamError(res, origin);
          const body = await res.json();
          const msg = body?.choices?.[0]?.message ?? {};
          const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
          return json(
            {
              content: typeof msg.content === 'string' ? msg.content : null,
              tool_calls: calls
                .filter((c: { type?: string }) => c.type === 'function')
                .map((c: { id: string; function: { name: string; arguments: string } }) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments })),
            },
            200,
            origin,
          );
        }

        case 'transcribe': {
          if (Number(req.headers.get('Content-Length') ?? 0) > MAX_AUDIO_BYTES) return json({ error: 'Recording too long' }, 413, origin);
          const form = await req.formData().catch(() => null);
          const audio = form?.get('audio');
          if (!(audio instanceof File) || audio.size === 0) return json({ error: 'Invalid request' }, 400, origin);
          if (audio.size > MAX_AUDIO_BYTES) return json({ error: 'Recording too long' }, 413, origin);
          if (!/^(audio|video)\//.test(audio.type)) return json({ error: 'Unsupported audio format' }, 415, origin);
          // Audio is forwarded for transcription only; nothing is stored.
          const upstream = new FormData();
          upstream.append('file', audio, audio.name || 'speech.webm');
          upstream.append('model', config.transcribeModel);
          const res = await openai('/audio/transcriptions', { method: 'POST', body: upstream });
          if (!res.ok) return upstreamError(res, origin);
          const body = await res.json();
          return json({ text: String(body?.text ?? '') }, 200, origin);
        }

        case 'speech': {
          const parsed = speechSchema.safeParse(await req.json().catch(() => null));
          if (!parsed.success) return json({ error: 'Invalid request' }, 400, origin);
          const res = await openai('/audio/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: config.ttsModel,
              voice: config.ttsVoice,
              input: parsed.data.text,
              instructions: 'Speak naturally, calm and composed, at a relaxed conversational pace.',
              response_format: 'mp3',
            }),
          });
          if (!res.ok || !res.body) return upstreamError(res, origin);
          return new Response(res.body, { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'audio/mpeg' } });
        }

        default:
          return json({ error: 'Not found' }, 404, origin);
      }
    } catch (err) {
      log('cyrus function error', err);
      return json({ error: 'Cyrus couldn’t respond. Please try again.' }, 500, origin);
    }
  };
}
