/**
 * CYRUS assistant — service contracts.
 *
 * The UI talks only to an `AssistantProvider`. Today there are two:
 *  - `DemoAssistantProvider`   — no AI. Every request is refused with `AssistantNotConnectedError`.
 *                                 We never fabricate assistant replies.
 *  - `ProxyAssistantProvider`  — calls the `cyrus` Supabase Edge Function, which holds the OpenAI key
 *                                 server-side and forwards to OpenAI.
 *
 * Future providers (realtime voice over WebRTC, on-device, Siri/App Intents bridge) implement the same
 * contract, so the conversation engine and the orb do not change.
 */

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ConversationMessage {
  id: string;
  /** `notice` = system information shown to the user (never sent to the model). */
  role: ChatRole | 'notice';
  text: string;
  createdAt: string;
}

export interface AssistantReply {
  text: string;
  /** Reserved for tool use (log weight, create task…) — see `capabilities.ts`. */
  actions?: AssistantAction[];
}

export interface AssistantAction {
  capability: string;
  arguments: Record<string, unknown>;
}

export type AssistantConnection =
  | { kind: 'demo' } // no backend configured
  | { kind: 'checking' }
  | { kind: 'connected'; model: string | null }
  | { kind: 'unavailable'; reason: string }; // backend present, AI not configured or unreachable

export interface AssistantProvider {
  readonly id: 'demo' | 'proxy';
  status(signal?: AbortSignal): Promise<AssistantConnection>;
  /** Speech → text. */
  transcribe(audio: Blob, signal: AbortSignal): Promise<string>;
  /** Conversation → assistant reply. */
  reply(history: ChatTurn[], signal: AbortSignal): Promise<AssistantReply>;
  /** Text → speech audio. */
  speak(text: string, signal: AbortSignal): Promise<Blob>;
}

export class AssistantNotConnectedError extends Error {
  constructor() {
    super('Cyrus AI is not connected');
    this.name = 'AssistantNotConnectedError';
  }
}

export class AssistantRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'AssistantRequestError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
