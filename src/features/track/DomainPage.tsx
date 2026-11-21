import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { DOMAIN_SECTIONS, LIFE_DOMAIN_CONFIG, isLifeDomain, type DomainSection } from '@/domain/lifeDomains';
import type { LifeDomainConfig } from '@/domain/lifeDomains';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DomainGoals } from './modules/DomainGoals';
import { DOMAIN_MODULES } from './modules/registry';
import { NotYetTracked } from './modules/NotYetTracked';

/** A single life domain: Overview · Goals · Activities · Progress · History. */
export function DomainPage() {
  const { domain } = useParams();
  const [params, setParams] = useSearchParams();
  if (!isLifeDomain(domain)) return <Navigate to="/track" replace />;

  const config = LIFE_DOMAIN_CONFIG[domain];
  const requested = params.get('section') as DomainSection | null;
  const section: DomainSection = DOMAIN_SECTIONS.some((s) => s.id === requested) ? requested! : 'overview';

  return (
    <>
      <div className="flex min-h-11 items-center pt-1">
        <Link
          to="/track"
          className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full pr-3 pl-1.5 text-callout text-muted transition hover:bg-white/5 hover:text-fg"
        >
          <ChevronLeft className="size-5" /> Track
        </Link>
      </div>

      <DomainHeader config={config} />

      <SegmentedControl
        label={`${config.name} sections`}
        size="sm"
        className="mt-6 sm:max-w-lg"
        value={section}
        onChange={(s) => setParams(s === 'overview' ? {} : { section: s }, { replace: true })}
        options={DOMAIN_SECTIONS.map((s) => ({ value: s.id, label: s.label }))}
      />

      <div className="mt-6" role="tabpanel" aria-label={DOMAIN_SECTIONS.find((s) => s.id === section)?.label}>
        <DomainSectionView config={config} section={section} />
      </div>
    </>
  );
}

function DomainHeader({ config }: { config: LifeDomainConfig }) {
  const Icon = config.icon;
  return (
    <header className="mt-4 flex items-center gap-4">
      <span
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${config.accent} 45%, white 10%), color-mix(in oklab, ${config.accent} 18%, transparent) 70%)`,
          color: 'white',
          boxShadow: `0 0 44px -8px ${config.accent}`,
        }}
      >
        <Icon className="size-7" />
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-display font-bold">{config.name}</h1>
        <p className="text-callout text-muted">{config.tagline}</p>
      </div>
    </header>
  );
}

function DomainSectionView({ config, section }: { config: LifeDomainConfig; section: DomainSection }) {
  if (section === 'goals') return <DomainGoals domain={config.id} />;
  const Module = DOMAIN_MODULES[config.id]?.[section];
  if (Module) return <Module />;
  if (section === 'overview') return <AreasOverview config={config} />;
  return <NotYetTracked config={config} section={section} />;
}

function AreasOverview({ config }: { config: LifeDomainConfig }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="px-1 text-subhead font-medium text-muted">What this domain covers</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {config.areas.map((a) => (
            <li key={a} className="rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-subhead">
              {a}
            </li>
          ))}
        </ul>
      </section>
      <DomainGoals domain={config.id} compact />
    </div>
  );
}
