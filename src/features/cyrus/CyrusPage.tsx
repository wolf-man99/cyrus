import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Captions as CaptionsIcon, Eye, History, Keyboard, X } from 'lucide-react';
import { CyrusOrb } from '@/components/orb/CyrusOrb';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { useCyrusConversation } from './useCyrusConversation';
import type { CyrusStatus } from './conversationMachine';
import { TalkButton } from './components/TalkButton';
import { SideButton } from './components/SideButton';
import { Captions } from './components/Captions';
import { Composer } from './components/Composer';
import { HistorySheet } from './components/HistorySheet';
import { ConnectionBadge } from './components/ConnectionBadge';
import { StatePreview } from './components/StatePreview';

const STATUS_TEXT: Record<CyrusStatus, string> = {
  idle: 'Hold the mic to talk, or tap once',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  error: '',
};

const BACKDROPS: Record<CyrusStatus, string> = {
  idle: 'radial-gradient(85% 60% at 50% 42%, rgb(0 214 180 / 0.20) 0%, rgb(19 163 255 / 0.10) 45%, transparent 72%)',
  listening: 'radial-gradient(90% 70% at 50% 42%, rgb(46 240 122 / 0.28) 0%, rgb(0 214 180 / 0.14) 45%, transparent 78%)',
  thinking: 'radial-gradient(90% 65% at 50% 42%, rgb(19 163 255 / 0.28) 0%, rgb(31 107 255 / 0.16) 50%, transparent 80%)',
  speaking: 'radial-gradient(95% 72% at 50% 42%, rgb(0 214 180 / 0.26) 0%, rgb(19 163 255 / 0.16) 45%, transparent 80%)',
  interrupted: 'radial-gradient(80% 55% at 50% 42%, rgb(200 255 225 / 0.16) 0%, transparent 70%)',
  error: 'radial-gradient(80% 55% at 50% 42%, rgb(255 77 94 / 0.22) 0%, transparent 70%)',
};

const CAPTIONS_KEY = 'cyrus.captions';
function readCaptionsPref(): boolean {
  try {
    return localStorage.getItem(CAPTIONS_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** CYRUS — the immersive, full-screen assistant. */
export function CyrusPage() {
  const navigate = useNavigate();
  const convo = useCyrusConversation();
  const [captions, setCaptions] = useState(readCaptionsPref);
  const [typing, setTyping] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<CyrusStatus | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const canPreview = convo.connection.kind === 'demo' || convo.connection.kind === 'unavailable';
  const status = preview ?? convo.status;

  // Synthetic level for the visual preview only.
  const previewLevel = useRef(() => {
    const t = performance.now() / 1000;
    return Math.max(0, 0.45 + 0.35 * Math.sin(t * 7.3) * Math.sin(t * 2.1) + 0.15 * Math.sin(t * 13.7));
  });
  const getLevel = preview ? previewLevel.current : convo.getLevel;

  const toggleCaptions = () => {
    setCaptions((on) => {
      try {
        localStorage.setItem(CAPTIONS_KEY, on ? 'off' : 'on');
      } catch {
        /* storage unavailable */
      }
      return !on;
    });
  };

  const exitPreview = useCallback(() => {
    setPreview(null);
    setPreviewOpen(false);
  }, []);

  const end = () => {
    if (convo.status === 'listening' || convo.status === 'thinking' || convo.status === 'speaking') convo.interrupt();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  // Escape ends the conversation (when no sheet / composer has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !historyOpen && !typing) end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const statusText = status === 'error' ? (preview ? 'Something went wrong' : convo.error) : STATUS_TEXT[status];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-canvas text-white" data-status={status}>
      {/* Backdrop */}
      <div className="cosmos" aria-hidden />
      {(Object.keys(BACKDROPS) as CyrusStatus[]).map((s) => (
        <div key={s} aria-hidden className="cyrus-backdrop" data-active={s === status} style={{ background: BACKDROPS[s] }} />
      ))}

      {/* Header */}
      <header className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 pt-[max(var(--safe-top),1rem)]">
        <IconButton label="End conversation" icon={<X className="size-5" />} onClick={end} className="bg-white/10" />
        <div className="flex flex-col items-center">
          <p className="text-subhead font-semibold text-white/85">Cyrus</p>
          <ConnectionBadge
            connection={convo.connection}
            onClick={canPreview ? () => (previewOpen ? exitPreview() : setPreviewOpen(true)) : undefined}
          />
        </div>
        <IconButton
          label="Conversation history"
          icon={<History className="size-5" />}
          onClick={() => setHistoryOpen(true)}
          className="bg-white/10"
        />
      </header>

      {previewOpen && (
        <div className="relative z-10 mt-3 px-4">
          <StatePreview value={preview} onChange={setPreview} />
        </div>
      )}

      {/* Orb */}
      <main className="relative z-0 flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <CyrusOrb status={status} getLevel={getLevel} className="w-[min(84vw,50dvh,30rem)]" />
        <div className="mt-2 flex min-h-12 flex-col items-center gap-2 text-center" aria-live="assertive">
          <p className={status === 'error' ? 'max-w-xs text-callout text-danger' : 'text-callout text-white/70'}>{statusText}</p>
          {status === 'error' && !preview && (
            <Button size="sm" variant="secondary" onClick={convo.dismissError}>
              Dismiss
            </Button>
          )}
        </div>
      </main>

      {/* Transcript + controls */}
      <footer className="relative z-10 space-y-4 px-4 pb-[max(var(--safe-bottom),1.25rem)]">
        {captions && !preview && <Captions messages={convo.messages} />}

        {typing ? (
          <Composer onSend={convo.sendText} onClose={() => setTyping(false)} />
        ) : (
          <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-end">
            <div className="flex justify-start">
              {canPreview && (
                <SideButton
                  label="preview"
                  ariaLabel="Preview orb states"
                  pressed={previewOpen}
                  icon={<Eye className="size-5" />}
                  onClick={() => (previewOpen ? exitPreview() : setPreviewOpen(true))}
                />
              )}
            </div>
            <TalkButton
              status={preview ? 'idle' : convo.status}
              onStart={() => {
                exitPreview();
                void convo.startListening();
              }}
              onStop={() => void convo.stopListening()}
              onInterrupt={convo.interrupt}
            />
            <div className="flex flex-col items-end gap-3">
              <SideButton label="captions" pressed={captions} icon={<CaptionsIcon className="size-5" />} onClick={toggleCaptions} />
              <SideButton
                label="type"
                ariaLabel="Type a message"
                icon={<Keyboard className="size-5" />}
                onClick={() => {
                  exitPreview();
                  setTyping(true);
                }}
              />
            </div>
          </div>
        )}
      </footer>

      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} messages={convo.messages} onClear={convo.clear} />
    </div>
  );
}
