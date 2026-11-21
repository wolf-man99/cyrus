import { getAudioContext, levelFromAnalyser } from './audioContext';

/** Plays Cyrus's spoken replies and exposes the output level so the orb can "speak". */
export class SpeechPlayer {
  private source: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private rejectPlayback: ((reason: unknown) => void) | null = null;

  /** Resolves when playback ends; rejects with AbortError if stopped or aborted. */
  async play(audio: Blob, signal: AbortSignal): Promise<void> {
    const ctx = getAudioContext();
    if (!ctx) throw new Error('Audio playback is not supported in this browser');
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);

    const decoded = await ctx.decodeAudioData(await audio.arrayBuffer());
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    this.stop();
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    this.source = source;
    this.analyser = analyser;
    this.buffer = new Float32Array(analyser.fftSize);

    await new Promise<void>((resolve, reject) => {
      this.rejectPlayback = reject;
      const onAbort = () => {
        this.stop();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      source.onended = () => {
        signal.removeEventListener('abort', onAbort);
        if (this.source === source) this.cleanup();
        resolve();
      };
      source.start();
    });
  }

  level(): number {
    return this.analyser && this.buffer ? levelFromAnalyser(this.analyser, this.buffer) : 0;
  }

  stop(): void {
    const reject = this.rejectPlayback;
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.cleanup();
    reject?.(new DOMException('Playback stopped', 'AbortError'));
  }

  private cleanup(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.source = null;
    this.analyser = null;
    this.buffer = null;
    this.rejectPlayback = null;
  }
}
