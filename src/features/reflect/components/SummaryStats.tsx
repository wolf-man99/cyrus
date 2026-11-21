import type { PeriodSummary } from '@/domain/summary';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import { formatNumber, formatPercent } from '@/lib/format';
import { money } from '@/features/track/domains/types';

/** The key numbers for a day, week or month, as compact figures. */
export function SummaryStats({ summary, currency }: { summary: PeriodSummary; currency: string }) {
  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: 'Tasks done',
      value: summary.tasks.total ? `${summary.tasks.done}/${summary.tasks.total}` : '—',
      hint: summary.tasks.missed.length ? `${summary.tasks.missed.length} missed` : undefined,
    },
    { label: 'Habit consistency', value: summary.habits.overallRate !== null ? formatPercent(summary.habits.overallRate) : '—' },
    { label: 'Workouts', value: String(summary.workouts.count), hint: summary.workouts.minutes ? `${summary.workouts.minutes} min` : undefined },
    { label: 'Spent', value: money(summary.money.spent, currency, true), hint: summary.money.earned ? `${money(summary.money.earned, currency, true)} earned` : undefined },
    { label: 'Mood', value: summary.mood !== null ? `${formatNumber(summary.mood)}/5` : '—', hint: summary.energy !== null ? `Energy ${formatNumber(summary.energy)}/5` : undefined },
    {
      label: 'Weight',
      value: summary.weight ? `${formatNumber(summary.weight.end)} ${summary.weight.unit}` : '—',
      hint: summary.weight ? `${summary.weight.change > 0 ? '+' : summary.weight.change < 0 ? '−' : ''}${formatNumber(Math.abs(summary.weight.change))} ${summary.weight.unit}` : undefined,
    },
  ];
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-4">
      {stats.map((s) => (
        <div key={s.label} className="min-w-0">
          <dt className="truncate text-footnote text-muted">{s.label}</dt>
          <dd className="mt-0.5 truncate text-headline font-semibold tabular">{s.value}</dd>
          {s.hint && <dd className="truncate text-footnote text-subtle tabular">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Activity per life domain, with the quiet ones called out. */
export function DomainActivity({ summary }: { summary: PeriodSummary }) {
  const max = Math.max(1, ...Object.values(summary.domains));
  return (
    <ul className="space-y-2">
      {Object.entries(summary.domains).map(([d, n]) => {
        const config = LIFE_DOMAIN_CONFIG[d as keyof typeof LIFE_DOMAIN_CONFIG];
        return (
          <li key={d} className="flex items-center gap-3 text-subhead">
            <span className="w-32 shrink-0 truncate">{config.name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: config.accent }} />
            </span>
            <span className={n ? 'w-6 text-right text-muted tabular' : 'w-6 text-right text-subtle tabular'}>{n}</span>
          </li>
        );
      })}
    </ul>
  );
}
