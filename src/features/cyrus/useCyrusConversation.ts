import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import { useProfile } from '@/data/hooks/useProfile';
import { uid } from '@/lib/id';
import { today } from '@/lib/dates';
import { chatInputSchema } from '@/domain/schemas';
import type { ActionRecord, StoredMessage } from '@/domain/types';
import {
  AssistantNotConnectedError,
  createAssistantServices,
  isAbortError,
  type AssistantConnection,
  type AssistantContext,
  type ConversationMessage,
  type ModelMessage,
} from '@/services/assistant';
import { runTurn, type PendingConfirmation } from '@/services/assistant/engine';
import { MicrophoneCapture, MicrophoneError } from '@/services/audio/microphone';
import { SpeechPlayer } from '@/services/audio/speechPlayer';
import { unlockAudio } from '@/services/audio/audioContext';
import { createVoiceActivity } from '@/services/audio/voiceActivity';
import { conversationReducer, initialConversationState } from './conversationMachine';

const HISTORY_TURNS = 20;
const MIN_UTTERANCE_MS = 350;
const INTERRUPTED_HOLD_MS = 900;
const RESUME_WITHIN_MS = 12 * 60 * 60 * 1000;

const YES = /^(yes|yeah|yep|yup|sure|ok(ay)?|confirm(ed)?|do it|go ahead|please do|correct|that'?s right|sounds good)\b/i;
const NO = /^(no|nope|nah|cancel|don'?t|do not|stop|never ?mind|wait|hold on)\b/i;

/** What Cyrus says it is doing while a tool runs. */
const TOOL_ACTIVITY: Record<string, string> = {
  get_today: 'Looking at today',
  find_tasks: 'Finding your tasks',
  get_goals: 'Checking your goals',
  get_weight: 'Looking at your weight',
  get_workouts: 'Checking your workouts',
  get_finances: 'Checking your finances',
  get_habits: 'Checking your habits',
  get_period_review: 'Reviewing the period',
  get_domain_activity: 'Looking at your activity',
  get_metrics: 'Checking your numbers',
  get_learning: 'Checking your learning',
  get_projects: 'Checking your projects',
  get_reflections: 'Reading your reflections',
};

const message = (role: ConversationMessage['role'], text: string, extra: Partial<ConversationMessage> = {}): ConversationMessage => ({
  id: uid(),
  role,
  text,
  createdAt: new Date().toISOString(),
  ...extra,
});

const fromStored = (m: StoredMessage): ConversationMessage => ({ id: m.id, role: m.role, text: m.content, createdAt: m.createdAt, actions: m.actions });

export function notConnectedNotice(connection: AssistantConnection): string {
  if (connection.kind === 'unavailable') return `${connection.reason} Nothing was sent.`;
  if (connection.kind === 'checking') return 'Still connecting to Cyrus. Try again in a moment.';
  return 'Demo mode: voice isn’t sent anywhere until Cyrus AI is connected. You can type to see a demo response.';
}

/**
 * Orchestrates a conversation: microphone → speech-to-text → reasoning with tools → text-to-speech,
 * with interruption at any point, confirmations for consequential changes, and memory stored in
 * the user's conversations. Pure state transitions live in `conversationMachine.ts`.
 */
export function useCyrusConversation() {
  const services = useMemo(() => createAssistantServices(), []);
  const repo = useRepository();
  const qc = useQueryClient();
  const profile = useProfile().data;
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [connection, setConnection] = useState<AssistantConnection>(services.mode === 'demo' ? { kind: 'demo' } : { kind: 'checking' });
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);

  const statusRef = useRef(state.status);
  const messagesRef = useRef(state.messages);
  const connectionRef = useRef(connection);
  const conversationRef = useRef(conversationId);
  const profileRef = useRef(profile);
  useEffect(() => {
    statusRef.current = state.status;
    messagesRef.current = state.messages;
    connectionRef.current = connection;
    conversationRef.current = conversationId;
    profileRef.current = profile;
  });

  const micRef = useRef<MicrophoneCapture | null>(null);
  const playerRef = useRef<SpeechPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmRef = useRef<((ok: boolean) => void) | null>(null);
  const queuedRef = useRef<string | null>(null);
  const vadFrame = useRef<number | null>(null);
  const player = () => (playerRef.current ??= new SpeechPlayer());

  const conversations = useQuery({ queryKey: ['conversations', 'list'], queryFn: () => repo.conversations.list(20) });

  /* ───────────── Setup ───────────── */

  useEffect(() => {
    if (services.mode === 'demo') return;
    const ac = new AbortController();
    services.reasoner
      .status(ac.signal)
      .then(setConnection)
      .catch(() => undefined);
    return () => ac.abort();
  }, [services]);

  // Continue the most recent conversation if it's from the last few hours.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !conversations.data) return;
    resumed.current = true;
    const latest = conversations.data[0];
    if (!latest || latest.endedAt || Date.now() - new Date(latest.updatedAt).getTime() > RESUME_WITHIN_MS) return;
    repo.conversations
      .messages(latest.id, 40)
      .then((msgs) => {
        if (messagesRef.current.length) return;
        setConversationId(latest.id);
        dispatch({ type: 'LOAD', messages: msgs.map(fromStored) });
      })
      .catch(() => undefined);
  }, [conversations.data, repo]);

  // Know up front if the microphone is blocked, so the button can say so.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((s) => {
        status = s;
        setMicBlocked(s.state === 'denied');
        s.onchange = () => setMicBlocked(s.state === 'denied');
      })
      .catch(() => undefined);
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      micRef.current?.cancel();
      playerRef.current?.stop();
      confirmRef.current?.(false);
      if (recoverTimer.current) clearTimeout(recoverTimer.current);
      if (vadFrame.current) cancelAnimationFrame(vadFrame.current);
    },
    [],
  );

  /* ───────────── Helpers ───────────── */

  const getLevel = useCallback(() => {
    const status = statusRef.current;
    if (status === 'listening') return micRef.current?.level() ?? 0;
    if (status === 'speaking') return playerRef.current?.level() ?? 0;
    return 0;
  }, []);

  const notice = useCallback((text: string) => dispatch({ type: 'NOTICE', message: message('notice', text) }), []);

  const context = (): AssistantContext => {
    const p = profileRef.current;
    return {
      today: today(),
      localTime: new Intl.DateTimeFormat('en', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date()),
      timezone: p?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: p?.currency ?? 'USD',
      weightUnit: p?.weightUnit ?? 'kg',
      displayName: p?.displayName ?? null,
    };
  };

  /** Conversation memory for the model: recent turns as text. Not a source of facts. */
  const history = (): ModelMessage[] =>
    messagesRef.current
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.demo)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }));

  const persist = useCallback(
    async (role: 'user' | 'assistant', text: string, actions?: ActionRecord[]) => {
      try {
        let id = conversationRef.current;
        if (!id) {
          id = (await repo.conversations.create(null)).id;
          conversationRef.current = id;
          setConversationId(id);
        }
        await repo.conversations.append(id, { role, content: text.slice(0, 8000), actions });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      } catch {
        // Saving history is best-effort; the conversation itself carries on.
      }
    },
    [qc, repo],
  );

  const fail = useCallback(
    (error: unknown, retry?: string) => {
      setActivity(null);
      if (isAbortError(error)) return;
      if (error instanceof AssistantNotConnectedError) {
        dispatch({ type: 'DONE' });
        notice(notConnectedNotice(connectionRef.current));
        return;
      }
      setRetryText(retry ?? null);
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Something went wrong.' });
    },
    [notice],
  );

  const askConfirm = useCallback((p: PendingConfirmation) => {
    setPending(p);
    dispatch({ type: 'CONFIRM_REQUEST' });
    return new Promise<boolean>((resolve) => {
      confirmRef.current = resolve;
    });
  }, []);

  const resolveConfirm = useCallback((ok: boolean) => {
    const resolve = confirmRef.current;
    confirmRef.current = null;
    setPending(null);
    if (resolve) {
      dispatch({ type: 'CONFIRM_RESOLVED' });
      resolve(ok);
    }
  }, []);

  /** Runs one turn for text the user already sees in the transcript. */
  const respond = useCallback(
    async (userText: string, memory: ModelMessage[]) => {
      const ac = new AbortController();
      abortRef.current = ac;
      setRetryText(null);
      try {
        const turn = await runTurn({
          reasoner: services.reasoner,
          repo,
          context: context(),
          history: memory,
          userText,
          signal: ac.signal,
          confirm: askConfirm,
          onTool: (name) => setActivity(TOOL_ACTIVITY[name] ?? 'Working on it'),
        });
        setActivity(null);
        // Cyrus changed data: refresh every screen that shows it.
        if (turn.actions.some((a) => a.ok)) void qc.invalidateQueries();
        dispatch({ type: 'ASSISTANT_MESSAGE', message: message('assistant', turn.text, { actions: turn.actions, demo: turn.demo }) });
        if (turn.demo) {
          dispatch({ type: 'DONE' });
          return;
        }
        void persist('assistant', turn.text, turn.actions);
        try {
          const audio = await services.textToSpeech.synthesize(turn.text, ac.signal);
          dispatch({ type: 'SPEAK' });
          await player().play(audio, ac.signal);
        } catch (error) {
          if (isAbortError(error)) throw error;
          // Voice failed; the text reply is on screen, so carry on quietly.
        }
        dispatch({ type: 'DONE' });
      } catch (error) {
        fail(error, userText);
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        const queued = queuedRef.current;
        queuedRef.current = null;
        if (queued) void sendTextRef.current(queued);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [askConfirm, fail, persist, qc, repo, services],
  );

  /** The user said or typed something: handle confirmations, else start a turn. */
  const handleUserText = useCallback(
    async (text: string) => {
      if (confirmRef.current) {
        dispatch({ type: 'NOTICE', message: message('user', text) });
        if (YES.test(text.trim())) return resolveConfirm(true);
        // Anything else declines the pending change; a new request runs once Cyrus has answered.
        if (!NO.test(text.trim())) queuedRef.current = text;
        return resolveConfirm(false);
      }
      const isDemo = services.mode === 'demo';
      if (!isDemo && connectionRef.current.kind !== 'connected') {
        dispatch({ type: 'USER_MESSAGE', message: message('user', text) });
        dispatch({ type: 'DONE' });
        notice(notConnectedNotice(connectionRef.current));
        return;
      }
      const memory = history();
      dispatch({ type: 'USER_MESSAGE', message: message('user', text) });
      if (!isDemo) void persist('user', text);
      await respond(text, memory);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notice, persist, resolveConfirm, respond, services.mode],
  );

  /* ───────────── Controls ───────────── */

  const stopVad = () => {
    if (vadFrame.current) cancelAnimationFrame(vadFrame.current);
    vadFrame.current = null;
  };

  const interrupt = useCallback(() => {
    stopVad();
    abortRef.current?.abort();
    abortRef.current = null;
    playerRef.current?.stop();
    micRef.current?.cancel();
    micRef.current = null;
    queuedRef.current = null;
    if (confirmRef.current) resolveConfirm(false);
    setActivity(null);
    dispatch({ type: 'INTERRUPT' });
    if (recoverTimer.current) clearTimeout(recoverTimer.current);
    recoverTimer.current = setTimeout(() => dispatch({ type: 'RECOVER' }), INTERRUPTED_HOLD_MS);
  }, [resolveConfirm]);

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
      setMicBlocked(false);
    } catch (error) {
      if (micRef.current === mic) micRef.current = null;
      if (error instanceof MicrophoneError && error.kind === 'permission') setMicBlocked(true);
      fail(error);
      return;
    }
    if (micRef.current !== mic) {
      mic.cancel();
      return;
    }
    dispatch({ type: 'LISTEN' });
  }, [fail, interrupt]);

  const stopListening = useCallback(async () => {
    stopVad();
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
    let text: string;
    try {
      text = await services.speechToText.transcribe(recording.blob, ac.signal);
    } catch (error) {
      fail(error);
      return;
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
    if (!text) {
      dispatch({ type: 'DONE' });
      notice('I didn’t catch that. Try again.');
      return;
    }
    // Back to idle briefly so a confirmation answer or a new turn can start cleanly.
    dispatch({ type: 'DONE' });
    await handleUserText(text);
  }, [fail, handleUserText, notice, services]);

  /** Tap-to-talk: end the turn automatically when the user pauses. */
  const enableAutoStop = useCallback(() => {
    stopVad();
    const vad = createVoiceActivity();
    const tick = () => {
      if (statusRef.current !== 'listening' || !micRef.current) return stopVad();
      if (vad.sample(micRef.current.level(), performance.now())) {
        vadFrame.current = null;
        void stopListening();
        return;
      }
      vadFrame.current = requestAnimationFrame(tick);
    };
    vadFrame.current = requestAnimationFrame(tick);
  }, [stopListening]);

  const sendText = useCallback(
    async (raw: string): Promise<string | null> => {
      const parsed = chatInputSchema.safeParse(raw);
      if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Invalid message';
      unlockAudio();
      const status = statusRef.current;
      if (!confirmRef.current && (status === 'listening' || status === 'thinking' || status === 'speaking')) interrupt();
      // Don't wait for the reply: the input clears as soon as the message is accepted.
      void handleUserText(parsed.data);
      return null;
    },
    [handleUserText, interrupt],
  );
  const sendTextRef = useRef(sendText);
  useEffect(() => {
    sendTextRef.current = sendText;
  });

  const retry = useCallback(() => {
    const text = retryText;
    if (!text) return;
    dispatch({ type: 'DISMISS_ERROR' });
    // The user's message is already in the transcript; rerun the turn without repeating it.
    const memory = history();
    const last = memory.at(-1);
    if (last?.role === 'user' && last.content === text) memory.pop();
    dispatch({ type: 'USER_MESSAGE', message: message('notice', 'Trying again…') });
    void respond(text, memory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respond, retryText]);

  const dismissError = useCallback(() => {
    setRetryText(null);
    dispatch({ type: 'DISMISS_ERROR' });
  }, []);

  /** Close this conversation so the next one starts fresh. */
  const endConversation = useCallback(() => {
    const id = conversationRef.current;
    if (id) void repo.conversations.end(id).then(() => qc.invalidateQueries({ queryKey: ['conversations'] }));
  }, [qc, repo]);

  const newConversation = useCallback(() => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'error') interrupt();
    endConversation();
    setConversationId(null);
    conversationRef.current = null;
    dispatch({ type: 'CLEAR' });
  }, [endConversation, interrupt]);

  const openConversation = useCallback(
    async (id: string) => {
      if (statusRef.current !== 'idle' && statusRef.current !== 'error') interrupt();
      const msgs = await repo.conversations.messages(id, 60);
      setConversationId(id);
      conversationRef.current = id;
      dispatch({ type: 'LOAD', messages: msgs.map(fromStored) });
    },
    [interrupt, repo],
  );

  return {
    ...state,
    connection,
    pending,
    activity,
    micBlocked,
    canRetry: retryText !== null,
    conversationId,
    conversations: conversations.data ?? [],
    getLevel,
    startListening,
    stopListening,
    enableAutoStop,
    interrupt,
    sendText,
    confirm: () => resolveConfirm(true),
    decline: () => resolveConfirm(false),
    retry,
    dismissError,
    newConversation,
    openConversation,
    endConversation,
  };
}
