import { useNavigate } from 'react-router';
import { Pencil } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { useGoals } from '@/data/hooks/useData';
import { promptFor } from '@/domain/reflections';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import type { Reflection } from '@/domain/types';
import { formatPeriod } from '@/lib/dates';
import { MOOD_LABELS, ENERGY_LABELS } from '@/features/track/sheets/MoodSheet';

/** Read a past reflection, with a way back into editing it. */
export function ReflectionSheet({ reflection: r, onOpenChange }: { reflection: Reflection | null; onOpenChange(open: boolean): void }) {
  const navigate = useNavigate();
  const goals = useGoals({ includeArchived: true });
  const linked = r ? (goals.data ?? []).filter((g) => r.goalIds.includes(g.id)) : [];
  return (
    <Sheet
      open={r !== null}
      onOpenChange={onOpenChange}
      title={r ? formatPeriod(r.period, r.periodStart) : ''}
      description={r ? `${r.period[0]!.toUpperCase()}${r.period.slice(1)} reflection` : undefined}
      footer={
        r && (
          <Button block size="lg" variant="secondary" leadingIcon={<Pencil className="size-4" />} onClick={() => navigate(`/reflect/${r.period}/${r.periodStart}`)}>
            Edit
          </Button>
        )
      }
    >
      {r && (
        <article className="space-y-5 pb-2">
          {(r.mood || r.energy) && (
            <p className="text-subhead text-muted">
              {[r.mood && `Mood: ${MOOD_LABELS[r.mood - 1]}`, r.energy && `Energy: ${ENERGY_LABELS[r.energy - 1]}`].filter(Boolean).join(' · ')}
            </p>
          )}
          {Object.entries(r.responses)
            .filter(([, v]) => v.trim())
            .map(([k, v]) => (
              <section key={k}>
                <h3 className="text-footnote font-medium text-muted">{promptFor(r.period, k)}</h3>
                <p className="mt-1 text-callout leading-relaxed whitespace-pre-line">{v}</p>
              </section>
            ))}
          {Object.keys(r.domainRatings).length > 0 && (
            <section>
              <h3 className="text-footnote font-medium text-muted">Areas of life</h3>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-subhead">
                {LIFE_DOMAIN_LIST.filter((d) => r.domainRatings[d.id]).map((d) => (
                  <li key={d.id} className="flex justify-between">
                    <span>{d.name}</span>
                    <span className="text-muted tabular">{r.domainRatings[d.id]}/5</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {linked.length > 0 && (
            <section>
              <h3 className="text-footnote font-medium text-muted">Goals</h3>
              <p className="mt-1 text-callout">{linked.map((g) => g.title).join(', ')}</p>
            </section>
          )}
        </article>
      )}
    </Sheet>
  );
}
