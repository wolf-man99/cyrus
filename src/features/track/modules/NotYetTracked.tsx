import { Orbit } from 'lucide-react';
import type { DomainSection, LifeDomainConfig } from '@/domain/lifeDomains';
import { EmptyState } from '@/components/ui/States';

/** Honest placeholder for domain sections whose logging isn't built yet. */
export function NotYetTracked({ config, section }: { config: LifeDomainConfig; section: DomainSection }) {
  const label = section === 'activities' ? 'activities' : section === 'progress' ? 'progress charts' : 'history';
  return (
    <EmptyState
      icon={<Orbit className="size-5" />}
      title={`No ${config.name.toLowerCase()} ${label} yet`}
      description={`Logging for ${config.areas.slice(0, 3).join(', ').toLowerCase()} arrives in the next build phase`}
    />
  );
}
