/**
 * CYRUS assistant proxy — Supabase Edge Function (Deno) entry point.
 * The OpenAI key lives only here (`supabase secrets set OPENAI_API_KEY=…`), never in the browser.
 * Logic is in handler.ts; this file only reads configuration and verifies sessions.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler } from './handler.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handle = createHandler(
  {
    openaiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    openaiBaseUrl: Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
    chatModel: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
    transcribeModel: Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe',
    ttsModel: Deno.env.get('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts',
    ttsVoice: Deno.env.get('OPENAI_TTS_VOICE') ?? 'sage',
    allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((o) => o.trim()),
  },
  {
    async verifyUser(token) {
      const { data, error } = await supabase.auth.getUser(token);
      return error || !data.user ? null : data.user.id;
    },
    fetch,
    log: console.error,
  },
);

Deno.serve(handle);
