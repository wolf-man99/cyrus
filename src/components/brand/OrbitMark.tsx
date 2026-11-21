import { useId } from 'react';

const BACK = 'M1.5 12 A10.5 3.6 0 0 1 22.5 12';
const FRONT = 'M1.5 12 A10.5 3.6 0 0 0 22.5 12';
const TILT = 'rotate(-24 12 12)';

/**
 * The CYRUS mark: a planet with one orbit and a single dot — the product's signature,
 * echoed by the Today planet and the assistant orb. Flat, one colour (currentColor).
 */
export function OrbitMark({ className, title }: { className?: string; title?: string }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <mask id={`${id}-behind`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <circle cx="12" cy="12" r="7.8" fill="black" />
        </mask>
        <mask id={`${id}-gap`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <path d={FRONT} transform={TILT} stroke="black" strokeWidth="4.4" />
        </mask>
      </defs>
      <path d={BACK} transform={TILT} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" mask={`url(#${id}-behind)`} />
      <circle cx="12" cy="12" r="6.2" fill="currentColor" mask={`url(#${id}-gap)`} />
      <g transform={TILT}>
        <path d={FRONT} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="22.5" cy="12" r="1.9" fill="currentColor" />
      </g>
    </svg>
  );
}
