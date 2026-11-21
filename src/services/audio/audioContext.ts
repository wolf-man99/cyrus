type AudioContextCtor = typeof AudioContext;

let shared: AudioContext | null = null;

function ctor(): AudioContextCtor | null {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** One AudioContext for the app (iOS limits how many can exist). */
export function getAudioContext(): AudioContext | null {
  if (shared && shared.state !== 'closed') return shared;
  const Ctor = ctor();
  shared = Ctor ? new Ctor() : null;
  return shared;
}

/**
 * Must be called from a user gesture (tap / key press). iOS Safari keeps audio
 * suspended until then, which would silence Cyrus's spoken replies later.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

/** Converts an analyser's time-domain RMS into a perceptual 0..1 level. */
export function levelFromAnalyser(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i]! * buffer[i]!;
  const rms = Math.sqrt(sum / buffer.length);
  if (rms <= 0) return 0;
  const db = 20 * Math.log10(rms); // ≈ -60 (silence) … 0 (clipping)
  return Math.max(0, Math.min(1, (db + 55) / 42));
}
