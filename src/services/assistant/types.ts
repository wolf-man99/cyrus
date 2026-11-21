/**
 * CYRUS assistant — service contracts.
 *
 * Three independent services, so each can be swapped (e.g. for a realtime voice API or a
 * native iOS bridge) without touching the others or the UI:
 *
 *   SpeechToText  audio → text
 *   Reasoner      conversation + tools → reply or tool calls   (the "intelligence", server-side)
 *   TextToSpeech  text → audio
 *
 * Tools run on the client through the user's own Repository (Row Level Security applies), never
 * with elevated server credentials. See `tools.ts` and `engine.ts`.
 */

export interface ToolCall {
  id: string;
  name: string;
  /** JSON-encoded arguments, exactly as the model produced them. */
  arguments: string;
}

export type ModelMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Facts about the user's situation the model needs to interpret requests ("today", "kg", "₹"). */
export interface AssistantContext {
  today: string;
  localTime: string;
  timezone: string;
  currency: string;
  weightUnit: 'kg' | 'lb';
  displayName: string | null;
}

export interface ReasoningRequest {
  messages: ModelMessage[];
  tools: ToolSpec[];
  context: AssistantContext;
}

export interface ReasoningResponse {
  content: string | null;
  toolCalls: ToolCall[];
  /** True for clearly labelled demo output — never presented as AI. */
  demo?: boolean;
}

export type AssistantConnection =
  | { kind: 'demo' } // no backend configured
  | { kind: 'checking' }
  | { kind: 'connected'; model: string | null }
  | { kind: 'unavailable'; reason: string }; // backend present, AI not configured or unreachable

export interface SpeechToText {
  transcribe(audio: Blob, signal: AbortSignal): Promise<string>;
}

export interface TextToSpeech {
  synthesize(text: string, signal: AbortSignal): Promise<Blob>;
}

export interface Reasoner {
  status(signal?: AbortSignal): Promise<AssistantConnection>;
  complete(request: ReasoningRequest, signal: AbortSignal): Promise<ReasoningResponse>;
}

export interface AssistantServices {
  mode: 'demo' | 'proxy';
  speechToText: SpeechToText;
  reasoner: Reasoner;
  textToSpeech: TextToSpeech;
}

/** A message in the visible transcript. */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'notice';
  text: string;
  createdAt: string;
  /** Data changes Cyrus made in this turn. */
  actions?: { capability: string; summary: string; ok: boolean }[];
  /** A clearly labelled demo response, not AI output. */
  demo?: boolean;
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
