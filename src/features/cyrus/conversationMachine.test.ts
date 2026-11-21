import { describe, expect, it } from 'vitest';
import { conversationReducer as reduce, initialConversationState as initial, type ConversationState } from './conversationMachine';

const msg = (role: 'user' | 'assistant' | 'notice', text = 'hi') => ({ id: text + role, role, text, createdAt: '' });
const run = (events: Parameters<typeof reduce>[1][], from: ConversationState = initial) => events.reduce(reduce, from);

describe('conversation state machine', () => {
  it('runs a full voice turn', () => {
    const s = run([
      { type: 'LISTEN' },
      { type: 'LISTEN_END' },
      { type: 'USER_MESSAGE', message: msg('user') },
      { type: 'ASSISTANT_MESSAGE', message: msg('assistant') },
      { type: 'SPEAK' },
    ]);
    expect(s.status).toBe('speaking');
    expect(s.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(reduce(s, { type: 'DONE' }).status).toBe('idle');
  });

  it('can be interrupted while thinking or speaking, then recovers', () => {
    const thinking = run([{ type: 'USER_MESSAGE', message: msg('user') }]);
    expect(thinking.status).toBe('thinking');
    const interrupted = reduce(thinking, { type: 'INTERRUPT' });
    expect(interrupted.status).toBe('interrupted');
    expect(reduce(interrupted, { type: 'RECOVER' }).status).toBe('idle');
    // Barge-in: listening straight from interrupted
    expect(reduce(interrupted, { type: 'LISTEN' }).status).toBe('listening');
  });

  it('ignores interrupt when idle', () => {
    expect(reduce(initial, { type: 'INTERRUPT' })).toBe(initial);
  });

  it('drops a late assistant reply after an interruption', () => {
    const s = run([{ type: 'USER_MESSAGE', message: msg('user') }, { type: 'INTERRUPT' }, { type: 'ASSISTANT_MESSAGE', message: msg('assistant') }]);
    expect(s.messages).toHaveLength(1);
  });

  it('enters and leaves the error state', () => {
    const s = reduce(initial, { type: 'FAIL', error: 'Mic blocked' });
    expect(s).toMatchObject({ status: 'error', error: 'Mic blocked' });
    expect(reduce(s, { type: 'DISMISS_ERROR' })).toMatchObject({ status: 'idle', error: null });
    expect(reduce(s, { type: 'LISTEN' }).status).toBe('listening');
  });

  it('records notices without changing state', () => {
    const s = reduce(initial, { type: 'NOTICE', message: msg('notice') });
    expect(s.status).toBe('idle');
    expect(s.messages).toHaveLength(1);
  });

  it('pauses for confirmation and resumes thinking', () => {
    const waiting = run([{ type: 'USER_MESSAGE', message: msg('user') }, { type: 'CONFIRM_REQUEST' }]);
    expect(waiting.status).toBe('idle');
    expect(reduce(waiting, { type: 'CONFIRM_RESOLVED' }).status).toBe('thinking');
  });

  it('loads a saved conversation', () => {
    expect(reduce(initial, { type: 'LOAD', messages: [msg('user'), msg('assistant')] }).messages).toHaveLength(2);
  });

  it('cancels listening back to idle', () => {
    expect(run([{ type: 'LISTEN' }, { type: 'LISTEN_CANCEL' }]).status).toBe('idle');
  });
});
