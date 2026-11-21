import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AssistantRequestError, type AssistantConnection, type AssistantProvider, type ChatTurn } from './types';

const statusSchema = z.object({ ready: z.boolean(), model: z.string().nullable().optional(), reason: z.string().optional() });
const transcriptSchema = z.object({ text: z.string() });
const replySchema = z.object({ text: z.string().min(1) });

/**
 * Talks to the `cyrus` Supabase Edge Function. Requests carry the user's session JWT;
 * the function verifies it and calls OpenAI with a server-side key.
 */
export function createProxyAssistantProvider(supabase: SupabaseClient, functionUrl: string, anonKey: string): AssistantProvider {
  async function request(path: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new AssistantRequestError('You’re signed out. Sign in again to talk to Cyrus.', 401);

    let response: Response;
    try {
      response = await fetch(`${functionUrl}/${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}`, apikey: anonKey },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new AssistantRequestError('Can’t reach Cyrus. Check your connection.', null);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new AssistantRequestError(messageForStatus(response.status, body?.error), response.status);
    }
    return response;
  }

  return {
    id: 'proxy',

    async status(signal): Promise<AssistantConnection> {
      try {
        const res = await request('status', { method: 'GET', signal });
        const body = statusSchema.parse(await res.json());
        return body.ready
          ? { kind: 'connected', model: body.model ?? null }
          : { kind: 'unavailable', reason: body.reason ?? 'The AI service isn’t configured yet.' };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        return {
          kind: 'unavailable',
          reason: error instanceof AssistantRequestError ? error.message : 'The AI service is unreachable.',
        };
      }
    },

    async transcribe(audio, signal) {
      const form = new FormData();
      form.append('audio', audio, `speech.${extensionFor(audio.type)}`);
      const res = await request('transcribe', { method: 'POST', body: form, signal });
      return transcriptSchema.parse(await res.json()).text.trim();
    },

    async reply(history: ChatTurn[], signal) {
      const res = await request('chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, localTime: new Date().toString() }),
        signal,
      });
      return replySchema.parse(await res.json());
    },

    async speak(text, signal) {
      const res = await request('speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      });
      return res.blob();
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
