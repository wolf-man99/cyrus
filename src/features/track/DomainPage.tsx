import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { LIFE_DOMAIN_CONFIG, isLifeDomain, type LifeDomainConfig } from '@/domain/lifeDomains';
import { useProfile } from '@/data/hooks/useProfile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { QuickLogBar } from './components/QuickLogBar';
import { ChartCard } from './components/ChartCard';
import { GoalsSection } from './components/GoalsSection';
import { HistorySection } from './components/HistorySection';
import { DomainSheets } from './DomainSheets';
import { DOMAIN_MODULES } from './domains/registry';
import type { SheetRequest } from './domains/types';
import { trackRange, type RangeKey } from './range';

const RANGE_KEY = 'cyrus.track.range';
function readRange(): RangeKey {
  try {
    const v = localStorage.getItem(RANGE_KEY);
    return v === '7d' || v === '30d' || v === '90d' || v === '1y' ? v : '30d';
  } catch {
    return '30d';
  }
}

/** One life domain. All seven share this layout; the domain module fills in the specifics. */
export function DomainPage() {
  const { domain } = useParams();
  if (!isLifeDomain(domain)) return <Navigate to="/track" replace />;
  // Keyed so each domain mounts fresh (its hooks differ).
  return <DomainView key={domain} config={LIFE_DOMAIN_CONFIG[domain]} />;
}

function DomainView({ config }: { config: LifeDomainConfig }) {
  const module = DOMAIN_MODULES[config.id];
  const currency = useProfile().data?.currency ?? 'USD';
  const [rangeKey, setRangeKey] = useState<RangeKey>(readRange);
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  const range = trackRange(rangeKey);
  const history = module.useHistory(range, currency);
  const props = { range, currency, open: setSheet };
  const Icon = config.icon;

  const changeRange = (key: RangeKey) => {
    setRangeKey(key);
    try {
      localStorage.setItem(RANGE_KEY, key);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <>
      <div className="flex min-h-11 items-center pt-1">
        <Link to="/track" className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full pr-3 pl-1.5 text-callout text-muted transition-colors hover:bg-white/5 hover:text-fg">
          <ChevronLeft className="size-5" /> Track
        </Link>
      </div>

      <header className="mt-3 flex items-center gap-4">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-fg">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-display font-semibold">
            {config.name}
            <span aria-hidden className="size-2 rounded-full" style={{ background: config.accent }} />
          </h1>
          <p className="truncate text-callout text-muted">{config.areas.join(' · ')}</p>
        </div>
      </header>

      <div className="mt-6 space-y-9">
        <QuickLogBar actions={module.quickLogs.map((q) => ({ id: q.id, label: q.label, icon: q.icon, onSelect: () => setSheet(q.request) }))} />
        <section aria-labelledby="metrics-heading">
          <SectionHeader id="metrics-heading" title="Key metrics" meta={`${range.label[0]!.toUpperCase()}${range.label.slice(1)}`} />
          <div className="mt-2">
            <module.Metrics {...props} />
          </div>
        </section>
        <ChartCard title={module.progressTitle} range={rangeKey} onRangeChange={changeRange}>
          <module.Progress {...props} />
        </ChartCard>
        <GoalsSection domain={config.id} onAdd={() => setSheet({ type: 'goal' })} onOpen={(goal) => setSheet({ type: 'goal', goal })} />
        {module.Collections && <module.Collections {...props} />}
        <HistorySection items={history.items} isPending={history.isPending} error={history.error} onRetry={history.refetch} range={range} />
      </div>

      <DomainSheets domain={config.id} request={sheet} currency={currency} onClose={() => setSheet(null)} />
    </>
  );
}
