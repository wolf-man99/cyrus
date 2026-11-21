import { getAudioContext, levelFromAnalyser } from './audioContext';

export type MicrophoneErrorKind = 'unsupported' | 'permission' | 'no-device' | 'unavailable';

export class MicrophoneError extends Error {
  constructor(readonly kind: MicrophoneErrorKind) {
    super(
      {
        unsupported: 'Voice input isn’t supported in this browser. You can type instead.',
        permission: 'Microphone access is blocked. Allow it in your browser settings to talk to Cyrus.',
        'no-device': 'No microphone was found.',
        unavailable: 'The microphone couldn’t be started.',
      }[kind],
    );
    this.name = 'MicrophoneError';
  }
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

export interface Recording {
  blob: Blob;
  durationMs: number;
}

/**
 * Push-to-talk capture: records audio and exposes a live input level for the orb.
 * One instance per utterance.
 */
export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  async start(): Promise<void> {
    if (!MicrophoneCapture.isSupported()) throw new MicrophoneError('unsupported');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicrophoneError('permission');
      if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new MicrophoneError('no-device');
      throw new MicrophoneError('unavailable');
    }

    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
      this.source = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.buffer = new Float32Array(this.analyser.fftSize);
      this.source.connect(this.analyser);
    }

    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
    this.recorder.start(250);
    this.startedAt = performance.now();
  }

  /** Live input level 0..1. */
  level(): number {
    return this.analyser && this.buffer ? levelFromAnalyser(this.analyser, this.buffer) : 0;
  }

  /** Stops recording and returns the audio. */
  async stop(): Promise<Recording | null> {
    const recorder = this.recorder;
    const durationMs = performance.now() - this.startedAt;
    if (!recorder || recorder.state === 'inactive') {
      this.release();
      return null;
    }
    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await done;
    const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    this.release();
    return blob.size > 0 ? { blob, durationMs } : null;
  }

  /** Stops everything and discards audio. */
  cancel(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.release();
  }

  private release(): void {
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.recorder = null;
    this.chunks = [];
  }
}
