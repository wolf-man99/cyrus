import type { ConversationMessage } from '@/services/ai/types';

/**
 * The six visual/interaction states of the Cyrus assistant.
 *   idle → listening → thinking → speaking → idle
 *   thinking|speaking|listening → interrupted → idle
 *   any → error → idle
 */
export type CyrusStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'error';

export const CYRUS_STATUSES: CyrusStatus[] = ['idle', 'listening', 'thinking', 'speaking', 'interrupted', 'error'];

export interface ConversationState {
  status: CyrusStatus;
  messages: ConversationMessage[];
  error: string | null;
}

export type ConversationEvent =
  | { type: 'LISTEN' }
  | { type: 'LISTEN_END' } // audio captured, now transcribing
  | { type: 'LISTEN_CANCEL' }
  | { type: 'USER_MESSAGE'; message: ConversationMessage }
  | { type: 'ASSISTANT_MESSAGE'; message: ConversationMessage }
  | { type: 'NOTICE'; message: ConversationMessage }
  | { type: 'SPEAK' }
  | { type: 'DONE' }
  | { type: 'INTERRUPT' }
  | { type: 'RECOVER' }
  | { type: 'FAIL'; error: string }
  | { type: 'DISMISS_ERROR' }
  | { type: 'CLEAR' };

export const initialConversationState: ConversationState = { status: 'idle', messages: [], error: null };

const MAX_MESSAGES = 200;

function append(state: ConversationState, message: ConversationMessage): ConversationMessage[] {
  return [...state.messages, message].slice(-MAX_MESSAGES);
}

export function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  const { status } = state;
  switch (event.type) {
    case 'LISTEN':
      return status === 'idle' || status === 'error' || status === 'interrupted'
        ? { ...state, status: 'listening', error: null }
        : state;
    case 'LISTEN_END':
      return status === 'listening' ? { ...state, status: 'thinking' } : state;
    case 'LISTEN_CANCEL':
      return status === 'listening' ? { ...state, status: 'idle' } : state;
    case 'USER_MESSAGE':
      // Typed messages start a turn from idle; voice turns arrive while already thinking.
      return status === 'idle' || status === 'thinking' || status === 'interrupted' || status === 'error'
        ? { ...state, status: 'thinking', error: null, messages: append(state, event.message) }
        : state;
    case 'ASSISTANT_MESSAGE':
      return status === 'thinking' ? { ...state, messages: append(state, event.message) } : state;
    case 'NOTICE':
      return { ...state, messages: append(state, event.message) };
    case 'SPEAK':
      return status === 'thinking' ? { ...state, status: 'speaking' } : state;
    case 'DONE':
      return status === 'thinking' || status === 'speaking' ? { ...state, status: 'idle' } : state;
    case 'INTERRUPT':
      return status === 'thinking' || status === 'speaking' || status === 'listening'
        ? { ...state, status: 'interrupted' }
        : state;
    case 'RECOVER':
      return status === 'interrupted' ? { ...state, status: 'idle' } : state;
    case 'FAIL':
      return { ...state, status: 'error', error: event.error };
    case 'DISMISS_ERROR':
      return status === 'error' ? { ...state, status: 'idle', error: null } : state;
    case 'CLEAR':
      return { ...state, messages: [] };
  }
}
