import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import type { CyrusStatus } from '@/features/cyrus/conversationMachine';

interface CyrusOrbProps {
  status: CyrusStatus;
  /** Returns the live audio level 0..1 (microphone while listening, voice while speaking). */
  getLevel?: () => number;
  className?: string;
}

const LABELS: Record<CyrusStatus, string> = {
  idle: 'Cyrus is ready',
  listening: 'Cyrus is listening',
  thinking: 'Cyrus is thinking',
  speaking: 'Cyrus is speaking',
  interrupted: 'Cyrus was interrupted',
  error: 'Cyrus hit a problem',
};

const BLOBS = 3;
const HALOS = 4;

interface Pose {
  x: number;
  y: number;
  sx: number;
  sy: number;
}

/** Orbit ring speed (deg/s) per state. */
const RING_SPEED: Record<CyrusStatus, number> = {
  idle: 7,
  listening: 22,
  thinking: 120,
  speaking: 34,
  interrupted: 0,
  error: 0,
};

/**
 * The Cyrus energy orb (Yap-inspired). Three blurred colour fields drift, merge and split;
 * concentric halos ripple with voice level. All motion is written straight to the DOM on
 * each animation frame (transform/opacity only), so React never re-renders per frame.
 */
export function CyrusOrb({ status, getLevel, className }: CyrusOrbProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const haloRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  const statusRef = useRef(status);
  const levelRef = useRef(getLevel);
  const changedAt = useRef(0);
  useEffect(() => {
    if (statusRef.current !== status) changedAt.current = performance.now();
    statusRef.current = status;
    levelRef.current = getLevel;
  }, [status, getLevel]);

  // Keep blur proportional to the rendered size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) root.style.setProperty('--orb-size', `${entry.contentRect.width}px`);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const poses: Pose[] = Array.from({ length: BLOBS }, () => ({ x: 0, y: 0, sx: 1, sy: 1 }));
    const halo = Array.from({ length: HALOS }, () => 1);
    let core = 1;
    let level = 0;
    let ring = 0;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = reduced.matches ? 0 : now / 1000;
      const s = statusRef.current;
      const sinceChange = (now - changedAt.current) / 1000;

      // Smoothed level: fast attack, slower release.
      const raw = s === 'listening' || s === 'speaking' ? Math.max(0, Math.min(1, levelRef.current?.() ?? 0)) : 0;
      level += (raw - level) * (raw > level ? 0.45 : 0.1);
      const L = reduced.matches ? level * 0.4 : level;

      const k = 1 - Math.exp(-dt * (s === 'interrupted' ? 16 : 7));

      for (let i = 0; i < BLOBS; i++) {
        const ph = i * 2.09;
        let target: Pose;
        switch (s) {
          case 'thinking': {
            const wave = Math.sin(t * 3.2 - i * 0.95);
            target = { x: (i - 1) * 0.36, y: wave * 0.08, sx: 0.42, sy: 0.6 + 0.12 * Math.sin(t * 3.2 - i * 0.95 + 1.2) };
            break;
          }
          case 'listening': {
            const amp = 0.035 + 0.08 * L;
            const sc = 1.02 + 0.42 * L + 0.02 * Math.sin(t * 2 + ph);
            target = {
              x: amp * Math.sin(t * 1.7 + ph),
              y: amp * Math.cos(t * 1.4 + ph * 1.3),
              sx: sc * (1 + 0.08 * Math.sin(t * 2.3 + ph)),
              sy: sc * (1 - 0.08 * Math.sin(t * 2.3 + ph)),
            };
            break;
          }
          case 'speaking': {
            const amp = 0.04 + 0.06 * L;
            const sc = 1 + 0.3 * L + 0.03 * Math.sin(t * 1.6 + ph);
            target = {
              x: amp * Math.sin(t * 1.25 + ph),
              y: amp * Math.cos(t * 1.1 + ph),
              sx: sc * (1 + 0.1 * Math.sin(t * 1.9 + ph)),
              sy: sc * (1 - 0.1 * Math.sin(t * 1.9 + ph)),
            };
            break;
          }
          case 'interrupted':
            target = { x: 0, y: 0, sx: 0.7, sy: 0.7 };
            break;
          case 'error': {
            const shake = 0.025 * Math.sin(now / 1000 * 42) * Math.exp(-sinceChange * 4);
            target = { x: shake + 0.015 * Math.sin(t * 0.8 + ph), y: 0.015 * Math.cos(t * 0.7 + ph), sx: 0.84, sy: 0.84 };
            break;
          }
          default: {
            const sc = 1 + 0.035 * Math.sin(t * 0.9 + ph);
            target = {
              x: 0.06 * Math.sin(t * 0.55 + ph),
              y: 0.06 * Math.cos(t * 0.47 + ph * 1.3),
              sx: sc * (1 + 0.05 * Math.sin(t * 0.7 + ph)),
              sy: sc * (1 - 0.05 * Math.sin(t * 0.7 + ph)),
            };
          }
        }
        const p = poses[i]!;
        p.x += (target.x - p.x) * k;
        p.y += (target.y - p.y) * k;
        p.sx += (target.sx - p.sx) * k;
        p.sy += (target.sy - p.sy) * k;
        const el = blobRefs.current[i];
        if (el) el.style.transform = `translate(${p.x * 100}%, ${p.y * 100}%) scale(${p.sx}, ${p.sy})`;
      }

      for (let h = 0; h < HALOS; h++) {
        let target = 1;
        if (s === 'idle') target = 1 + 0.015 * Math.sin(t * 0.8 - h * 0.5);
        if (s === 'listening') target = 1 + L * 0.1 * (h + 1) + 0.01 * Math.sin(t * 2 - h);
        if (s === 'speaking') target = 1 + L * 0.07 * (h + 1) + 0.012 * Math.sin(t * 1.4 - h);
        if (s === 'thinking') target = 1 + 0.035 * Math.sin(t * 2.4 - h * 0.7);
        if (s === 'interrupted') target = 0.92;
        if (s === 'error') target = 0.96;
        halo[h]! += (target - halo[h]!) * k;
        const el = haloRefs.current[h];
        if (el) el.style.transform = `scale(${halo[h]})`;
      }

      const coreTarget = s === 'thinking' ? 0.55 : s === 'interrupted' ? 0.5 : 0.85 + L * 0.6;
      core += (coreTarget - core) * k;
      if (coreRef.current) {
        coreRef.current.style.transform = `scale(${core})`;
        coreRef.current.style.opacity = String(s === 'error' ? 0.25 : 0.55 + L * 0.45);
      }

      if (!reduced.matches) ring = (ring + RING_SPEED[s] * dt) % 360;
      if (ringRef.current) ringRef.current.style.transform = `rotate(${ring}deg)`;

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={LABELS[status]}
      data-status={status}
      className={cn('cyrus-orb relative aspect-square', className)}
    >
      {/* Concentric halos (outermost first) */}
      {Array.from({ length: HALOS }, (_, h) => (
        <div
          key={h}
          ref={(el) => {
            haloRefs.current[HALOS - 1 - h] = el;
          }}
          className="orb-halo"
          style={{ inset: `${h * 7}%`, opacity: 0.1 + h * 0.07 }}
        />
      ))}

      {/* Orbit ring */}
      <div ref={ringRef} className="orb-ring">
        <span className="orb-ring__dot" />
      </div>

      {/* Energy fields */}
      <div className="orb-field">
        {Array.from({ length: BLOBS }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              blobRefs.current[i] = el;
            }}
            className={`orb-blob orb-blob--${i + 1}`}
          />
        ))}
      </div>
      <div ref={coreRef} className="orb-core" />

      {/* Shockwave on interruption */}
      {status === 'interrupted' && <div className="orb-shock" />}
    </div>
  );
}
