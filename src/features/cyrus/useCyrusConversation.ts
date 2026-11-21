import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { uid } from '@/lib/id';
import { chatInputSchema } from '@/domain/schemas';
import {
  AssistantNotConnectedError,
  createAssistantProvider,
  isAbortError,
  type AssistantConnection,
  type ChatTurn,
  type ConversationMessage,
} from '@/services/ai';
import { MicrophoneCapture } from '@/services/audio/microphone';
import { SpeechPlayer } from '@/services/audio/speechPlayer';
import { unlockAudio } from '@/services/audio/audioContext';
import { conversationReducer, initialConversationState } from './conversationMachine';

const HISTORY_TURNS = 20;
const MIN_UTTERANCE_MS = 350;
const INTERRUPTED_HOLD_MS = 900;

const message = (role: ConversationMessage['role'], text: string): ConversationMessage => ({
  id: uid(),
  role,
  text,
  createdAt: new Date().toISOString(),
});

export function notConnectedNotice(connection: AssistantConnection): string {
  if (connection.kind === 'unavailable') return `${connection.reason} Nothing was sent.`;
  if (connection.kind === 'checking') return 'Still connecting to Cyrus — try again in a moment.';
  return 'Demo mode — Cyrus AI isn’t connected, so nothing was sent or processed.';
}

/**
 * Orchestrates a push-to-talk conversation: microphone → transcription → reply → speech,
 * with interruption at any point. Pure state transitions live in `conversationMachine.ts`.
 */
export function useCyrusConversation() {
  const provider = useMemo(() => createAssistantProvider(), []);
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [connection, setConnection] = useState<AssistantConnection>(
    provider.id === 'demo' ? { kind: 'demo' } : { kind: 'checking' },
  );

  const statusRef = useRef(state.status);
  const messagesRef = useRef(state.messages);
  const connectionRef = useRef(connection);
  useEffect(() => {
    statusRef.current = state.status;
    messagesRef.current = state.messages;
    connectionRef.current = connection;
  });

  const micRef = useRef<MicrophoneCapture | null>(null);
  const playerRef = useRef<SpeechPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = () => (playerRef.current ??= new SpeechPlayer());

  // Is the AI actually reachable?
  useEffect(() => {
    if (provider.id === 'demo') return;
    const ac = new AbortController();
    provider
      .status(ac.signal)
      .then(setConnection)
      .catch(() => undefined);
    return () => ac.abort();
  }, [provider]);

  // Release the mic and stop audio when leaving.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      micRef.current?.cancel();
      playerRef.current?.stop();
      if (recoverTimer.current) clearTimeout(recoverTimer.current);
    },
    [],
  );

  /** Live level for the orb: microphone while listening, playback while speaking. */
  const getLevel = useCallback(() => {
    const status = statusRef.current;
    if (status === 'listening') return micRef.current?.level() ?? 0;
    if (status === 'speaking') return playerRef.current?.level() ?? 0;
    return 0;
  }, []);

  const notice = useCallback((text: string) => dispatch({ type: 'NOTICE', message: message('notice', text) }), []);

  const fail = useCallback(
    (error: unknown) => {
      if (isAbortError(error)) return; // interrupted on purpose
      if (error instanceof AssistantNotConnectedError) {
        dispatch({ type: 'DONE' });
        notice(notConnectedNotice(connectionRef.current));
        return;
      }
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Something went wrong.' });
    },
    [notice],
  );

  const history = (): ChatTurn[] =>
    messagesRef.current
      .filter((m): m is ConversationMessage & { role: ChatTurn['role'] } => m.role !== 'notice')
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.text }));

  /** Reply → speak → done. Throws AbortError if interrupted. */
  const respond = useCallback(
    async (turns: ChatTurn[], signal: AbortSignal) => {
      const reply = await provider.reply(turns, signal);
      dispatch({ type: 'ASSISTANT_MESSAGE', message: message('assistant', reply.text) });
      try {
        const audio = await provider.speak(reply.text, signal);
        dispatch({ type: 'SPEAK' });
        await player().play(audio, signal);
      } catch (error) {
        if (isAbortError(error)) throw error;
        // Voice failed, but the text reply is shown — not worth an error state.
      }
      dispatch({ type: 'DONE' });
    },
    [provider],
  );

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    playerRef.current?.stop();
    micRef.current?.cancel();
    micRef.current = null;
    dispatch({ type: 'INTERRUPT' });
    if (recoverTimer.current) clearTimeout(recoverTimer.current);
    recoverTimer.current = setTimeout(() => dispatch({ type: 'RECOVER' }), INTERRUPTED_HOLD_MS);
  }, []);

  /** Push-to-talk pressed. Interrupts Cyrus if it is thinking or speaking (barge-in). */
  const startListening = useCallback(async () => {
    unlockAudio();
    const status = statusRef.current;
    if (status === 'listening') return;
    if (status === 'thinking' || status === 'speaking') interrupt();
    if (recoverTimer.current) clearTimeout(recoverTimer.current);

    const mic = new MicrophoneCapture();
    micRef.current = mic;
    try {
      await mic.start();
    } catch (error) {
      if (micRef.current === mic) micRef.current = null;
      fail(error);
      return;
    }
    // Released (or interrupted) while the permission prompt was open.
    if (micRef.current !== mic) {
      mic.cancel();
      return;
    }
    dispatch({ type: 'LISTEN' });
  }, [fail, interrupt]);

  /** Push-to-talk released: send the utterance. */
  const stopListening = useCallback(async () => {
    const mic = micRef.current;
    micRef.current = null;
    if (!mic) return;
    if (statusRef.current !== 'listening') {
      mic.cancel();
      return;
    }
    const recording = await mic.stop();
    if (!recording || recording.durationMs < MIN_UTTERANCE_MS) {
      dispatch({ type: 'LISTEN_CANCEL' });
      return;
    }
    if (connectionRef.current.kind !== 'connected') {
      dispatch({ type: 'LISTEN_CANCEL' });
      notice(notConnectedNotice(connectionRef.current));
      return;
    }

    dispatch({ type: 'LISTEN_END' });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const text = await provider.transcribe(recording.blob, ac.signal);
      if (!text) {
        dispatch({ type: 'DONE' });
        notice('I didn’t catch that — try again.');
        return;
      }
      const turns = [...history(), { role: 'user' as const, content: text }];
      dispatch({ type: 'USER_MESSAGE', message: message('user', text) });
      await respond(turns, ac.signal);
    } catch (error) {
      fail(error);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, [fail, notice, provider, respond]);

  /** Typed message. Returns a validation error, if any. */
  const sendText = useCallback(
    async (raw: string): Promise<string | null> => {
      const parsed = chatInputSchema.safeParse(raw);
      if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Invalid message';
      unlockAudio();
      const status = statusRef.current;
      if (status === 'listening' || status === 'thinking' || status === 'speaking') interrupt();

      const text = parsed.data;
      if (connectionRef.current.kind !== 'connected') {
        // Show what was typed, then say plainly that it went nowhere.
        dispatch({ type: 'USER_MESSAGE', message: message('user', text) });
        dispatch({ type: 'DONE' });
        notice(notConnectedNotice(connectionRef.current));
        return null;
      }

      const turns = [...history(), { role: 'user' as const, content: text }];
      dispatch({ type: 'USER_MESSAGE', message: message('user', text) });
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        await respond(turns, ac.signal);
      } catch (error) {
        fail(error);
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
      }
      return null;
    },
    [fail, interrupt, notice, respond],
  );

  const dismissError = useCallback(() => dispatch({ type: 'DISMISS_ERROR' }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return {
    ...state,
    connection,
    getLevel,
    startListening,
    stopListening,
    interrupt,
    sendText,
    dismissError,
    clear,
  };
}
