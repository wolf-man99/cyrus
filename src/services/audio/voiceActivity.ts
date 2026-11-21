/**
 * Hands-free end of speech for tap-to-talk: once the user has spoken, a pause ends the turn.
 * Pure state machine fed one level sample per animation frame, so it is easy to test.
 */
export interface VoiceActivityOptions {
  /** Level (0..1) above which we consider the user to be speaking. */
  speechLevel: number;
  /** Level below which we consider it silent. */
  silenceLevel: number;
  /** Speech must last this long before a pause can end the turn. */
  minSpeechMs: number;
  /** A pause this long after speech ends the turn. */
  silenceMs: number;
  /** Hard cap on one utterance. */
  maxMs: number;
}

export const DEFAULT_VAD: VoiceActivityOptions = { speechLevel: 0.22, silenceLevel: 0.1, minSpeechMs: 250, silenceMs: 1400, maxMs: 60_000 };

export function createVoiceActivity(options: VoiceActivityOptions = DEFAULT_VAD) {
  let started: number | null = null;
  let speechMs = 0;
  let silentSince: number | null = null;
  let last: number | null = null;
  return {
    /** Returns true when the utterance should end. */
    sample(level: number, now: number): boolean {
      started ??= now;
      const dt = last === null ? 0 : now - last;
      last = now;
      if (now - started >= options.maxMs) return true;
      if (level >= options.speechLevel) {
        speechMs += dt;
        silentSince = null;
      } else if (level <= options.silenceLevel) {
        silentSince ??= now;
      }
      return speechMs >= options.minSpeechMs && silentSince !== null && now - silentSince >= options.silenceMs;
    },
    get heardSpeech() {
      return speechMs >= options.minSpeechMs;
    },
  };
}
