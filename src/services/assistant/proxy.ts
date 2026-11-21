import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  AssistantRequestError,
  type AssistantConnection,
  type AssistantServices,
  type ReasoningRequest,
  type ReasoningResponse,
} from './types';

const statusSchema = z.object({ ready: z.boolean(), model: z.string().nullable().optional(), reason: z.string().optional() });
const transcriptSchema = z.object({ text: z.string() });
const completionSchema = z.object({
  content: z.string().nullable(),
  tool_calls: z.array(z.object({ id: z.string(), name: z.string(), arguments: z.string() })).default([]),
});

/** A short TTS input: speak the first few sentences, never a wall of text. */
export function speakable(text: string, max = 600): string {
  const clean = text.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > 100 ? cut.slice(0, end + 1) : `${cut}…`;
}

/**
 * The three assistant services backed by the `cyrus` Supabase Edge Function.
 * Requests carry the user's session JWT; the function verifies it and calls OpenAI with a
 * server-side key. Audio is forwarded for transcription only and never stored.
 */
export function createProxyServices(supabase: SupabaseClient, functionUrl: string, anonKey: string): AssistantServices {
  async function request(path: string, init: RequestInit): Promise<Response> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AssistantRequestError('You’re offline. Reconnect to talk to Cyrus.', null);
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new AssistantRequestError('You’re signed out. Sign in again to talk to Cyrus.', 401);
    let response: Response;
    try {
      response = await fetch(`${functionUrl}/${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, apikey: anonKey } });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new AssistantRequestError('Can’t reach Cyrus. Check your connection and try again.', null);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new AssistantRequestError(messageForStatus(response.status, body?.error), response.status);
    }
    return response;
  }

  return {
    mode: 'proxy',
    speechToText: {
      async transcribe(audio, signal) {
        const form = new FormData();
        form.append('audio', audio, `speech.${extensionFor(audio.type)}`);
        const res = await request('transcribe', { method: 'POST', body: form, signal });
        return transcriptSchema.parse(await res.json()).text.trim();
      },
    },
    textToSpeech: {
      async synthesize(text, signal) {
        const res = await request('speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speakable(text) }),
          signal,
        });
        return res.blob();
      },
    },
    reasoner: {
      async status(signal): Promise<AssistantConnection> {
        try {
          const res = await request('status', { method: 'GET', signal });
          const body = statusSchema.parse(await res.json());
          return body.ready ? { kind: 'connected', model: body.model ?? null } : { kind: 'unavailable', reason: body.reason ?? 'The AI service isn’t configured yet.' };
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error;
          return { kind: 'unavailable', reason: error instanceof AssistantRequestError ? error.message : 'The AI service is unreachable.' };
        }
      },
      async complete(req: ReasoningRequest, signal): Promise<ReasoningResponse> {
        const res = await request('chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
          signal,
        });
        const body = completionSchema.parse(await res.json());
        return { content: body.content, toolCalls: body.tool_calls };
      },
    },
  };
}

function extensionFor(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

function messageForStatus(status: number, serverMessage?: string): string {
  switch (status) {
    case 401:
      return 'Your session expired. Sign in again to talk to Cyrus.';
    case 413:
      return 'That recording was too long. Try a shorter message.';
    case 429:
      return 'Cyrus is busy right now. Try again in a moment.';
    case 503:
      return serverMessage ?? 'Cyrus AI isn’t configured on the server yet.';
    default:
      return serverMessage ?? 'Cyrus couldn’t respond. Please try again.';
  }
}
