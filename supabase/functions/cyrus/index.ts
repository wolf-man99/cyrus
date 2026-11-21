/**
 * CYRUS assistant proxy — Supabase Edge Function (Deno).
 *
 *   GET  /cyrus/status      → { ready, model, reason? }
 *   POST /cyrus/chat        → { text }            body: { messages: [{ role, content }], localTime? }
 *   POST /cyrus/transcribe  → { text }            body: multipart/form-data with `audio`
 *   POST /cyrus/speech      → audio/mpeg          body: { text }
 *
 * Security:
 *   • The OpenAI key lives only here (`supabase secrets set OPENAI_API_KEY=…`), never in the browser.
 *   • Every request must carry a signed-in user's JWT. The anon key alone is rejected.
 *   • Inputs are validated and size-limited before anything is forwarded.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const CHAT_MODEL = Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini';
const TRANSCRIBE_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe';
const TTS_MODEL = Deno.env.get('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts';
const TTS_VOICE = Deno.env.get('OPENAI_TTS_VOICE') ?? 'sage';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((o) => o.trim());

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const OPENAI = 'https://api.openai.com/v1';

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
  localTime: z.string().max(120).optional(),
});
const speechSchema = z.object({ text: z.string().trim().min(1).max(1500) });

function systemPrompt(localTime?: string): string {
  return [
    'You are CYRUS, the AI assistant inside the CYRUS personal operating system.',
    'You help one person improve their physical, mental, intellectual, financial, social, career and entrepreneurial life.',
    'Your replies are usually spoken aloud: be warm, direct and brief — one to three short sentences unless asked for detail.',
    'Never use markdown, lists or emoji. Prefer one concrete next step over general advice.',
    'You cannot yet read or change the user’s data (tasks, habits, logs, goals). If asked to log, retrieve or update',
    'something, say plainly that this ability is not connected yet and suggest doing it from the Today screen.',
    'Never invent facts about the user’s data or progress.',
    localTime ? `The user’s local time is ${localTime}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes('*') ? '*' : origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

/** Maps an upstream OpenAI failure to a safe client-facing status. Details stay in server logs. */
async function upstreamError(res: Response, origin: string | null): Promise<Response> {
  console.error('OpenAI error', res.status, await res.text().catch(() => ''));
  if (res.status === 429) return json({ error: 'Cyrus is busy right now. Try again in a moment.' }, 429, origin);
  if (res.status === 401) return json({ error: 'Cyrus AI is misconfigured on the server.' }, 503, origin);
  return json({ error: 'Cyrus couldn’t respond. Please try again.' }, 502, origin);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

  // Require a real, signed-in user.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in' }, 401, origin);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Not signed in' }, 401, origin);

  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  if (route === 'status') {
    return OPENAI_API_KEY
      ? json({ ready: true, model: CHAT_MODEL }, 200, origin)
      : json({ ready: false, model: null, reason: 'Cyrus AI isn’t configured on the server yet.' }, 200, origin);
  }
  if (!OPENAI_API_KEY) return json({ error: 'Cyrus AI isn’t configured on the server yet.' }, 503, origin);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  const openaiHeaders = { Authorization: `Bearer ${OPENAI_API_KEY}` };

  try {
    switch (route) {
      case 'chat': {
        const parsed = chatSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return json({ error: 'Invalid request' }, 400, origin);
        const res = await fetch(`${OPENAI}/chat/completions`, {
          method: 'POST',
          headers: { ...openaiHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: CHAT_MODEL,
            max_completion_tokens: 500,
            messages: [{ role: 'system', content: systemPrompt(parsed.data.localTime) }, ...parsed.data.messages],
          }),
        });
        if (!res.ok) return upstreamError(res, origin);
        const body = await res.json();
        const text = String(body?.choices?.[0]?.message?.content ?? '').trim();
        if (!text) return json({ error: 'Cyrus had nothing to say. Try again.' }, 502, origin);
        return json({ text }, 200, origin);
      }

      case 'transcribe': {
        const length = Number(req.headers.get('Content-Length') ?? 0);
        if (length > MAX_AUDIO_BYTES) return json({ error: 'Recording too long' }, 413, origin);
        const form = await req.formData().catch(() => null);
        const audio = form?.get('audio');
        if (!(audio instanceof File) || audio.size === 0) return json({ error: 'Invalid request' }, 400, origin);
        if (audio.size > MAX_AUDIO_BYTES) return json({ error: 'Recording too long' }, 413, origin);
        if (!/^(audio|video)\//.test(audio.type)) return json({ error: 'Unsupported audio format' }, 415, origin);

        const upstream = new FormData();
        upstream.append('file', audio, audio.name || 'speech.webm');
        upstream.append('model', TRANSCRIBE_MODEL);
        const res = await fetch(`${OPENAI}/audio/transcriptions`, { method: 'POST', headers: openaiHeaders, body: upstream });
        if (!res.ok) return upstreamError(res, origin);
        const body = await res.json();
        return json({ text: String(body?.text ?? '') }, 200, origin);
      }

      case 'speech': {
        const parsed = speechSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return json({ error: 'Invalid request' }, 400, origin);
        const res = await fetch(`${OPENAI}/audio/speech`, {
          method: 'POST',
          headers: { ...openaiHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: parsed.data.text, response_format: 'mp3' }),
        });
        if (!res.ok || !res.body) return upstreamError(res, origin);
        return new Response(res.body, { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'audio/mpeg' } });
      }

      default:
        return json({ error: 'Not found' }, 404, origin);
    }
  } catch (err) {
    console.error('cyrus function error', err);
    return json({ error: 'Cyrus couldn’t respond. Please try again.' }, 500, origin);
  }
});
