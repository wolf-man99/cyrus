import { useState, type FormEvent } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface ComposerProps {
  onSend(text: string): Promise<string | null>;
  onClose(): void;
}

/** Text input alternative to voice. */
export function Composer({ onSend, onClose }: ComposerProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = await onSend(text);
    if (problem) setError(problem);
    else setText('');
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md" noValidate>
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 p-1.5 pl-2 backdrop-blur-xl">
        <IconButton label="Close keyboard input" tone="plain" size="sm" icon={<X className="size-4.5" />} onClick={onClose} />
        <label htmlFor="cyrus-composer" className="sr-only">
          Message Cyrus
        </label>
        <input
          id="cyrus-composer"
          autoFocus
          value={text}
          maxLength={2000}
          enterKeyHint="send"
          autoComplete="off"
          placeholder="Message Cyrus…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'cyrus-composer-error' : undefined}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          className="h-10 min-w-0 flex-1 bg-transparent text-body text-white placeholder:text-white/40 focus:outline-none"
        />
        <IconButton
          type="submit"
          label="Send message"
          tone="primary"
          size="sm"
          disabled={!text.trim()}
          icon={<ArrowUp className="size-4.5 stroke-[2.25]" />}
        />
      </div>
      {error && (
        <p id="cyrus-composer-error" role="alert" className="mt-2 text-center text-footnote text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
