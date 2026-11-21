import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { LifeDomain } from '@/domain/types';

/** Small domain icon in a tinted circle — used as the leading element in list rows. */
export function DomainIcon({ domain, size = 'md' }: { domain: LifeDomain | null; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'size-8' : 'size-10';
  const icon = size === 'sm' ? 'size-4' : 'size-[18px]';
  if (!domain) {
    return <span aria-hidden className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-white/[0.06]`} />;
  }
  const config = LIFE_DOMAIN_CONFIG[domain];
  const Icon = config.icon;
  return (
    <span
      aria-hidden
      className={`${dims} flex shrink-0 items-center justify-center rounded-full`}
      style={{ background: `color-mix(in oklab, ${config.accent} 16%, transparent)`, color: config.accent }}
    >
      <Icon className={icon} strokeWidth={2} />
    </span>
  );
}

export function DomainLabel({ domain }: { domain: LifeDomain }) {
  const config = LIFE_DOMAIN_CONFIG[domain];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: config.accent }} />
      {config.name}
    </span>
  );
}
