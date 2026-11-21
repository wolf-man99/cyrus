import { describe, expect, it } from 'vitest';
import { createVoiceActivity } from './voiceActivity';

const feed = (vad: ReturnType<typeof createVoiceActivity>, level: number, fromMs: number, toMs: number) => {
  for (let t = fromMs; t <= toMs; t += 16) if (vad.sample(level, t)) return t;
  return null;
};

describe('voice activity', () => {
  it('waits for speech before a pause can end the turn', () => {
    const vad = createVoiceActivity();
    expect(feed(vad, 0.02, 0, 5000)).toBeNull(); // silence only: keep listening
  });
  it('ends the turn after speech followed by a pause', () => {
    const vad = createVoiceActivity();
    expect(feed(vad, 0.5, 0, 1200)).toBeNull();
    const ended = feed(vad, 0.03, 1216, 4000);
    expect(ended).not.toBeNull();
    expect(ended! - 1216).toBeGreaterThanOrEqual(1400);
  });
  it('ignores short blips', () => {
    const vad = createVoiceActivity();
    feed(vad, 0.5, 0, 100);
    expect(feed(vad, 0.03, 116, 3000)).toBeNull();
  });
  it('caps an utterance', () => {
    const vad = createVoiceActivity({ speechLevel: 0.2, silenceLevel: 0.1, minSpeechMs: 250, silenceMs: 1400, maxMs: 2000 });
    expect(feed(vad, 0.5, 0, 3000)).toBeGreaterThanOrEqual(2000);
  });
});
