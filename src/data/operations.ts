import type { Repository } from './repository';
import type { LearningResource } from '@/domain/types';

/* Multi-step data operations shared by the UI and the assistant. */

/**
 * Logs reading or course progress: moves the resource forward and records the session,
 * finishing the resource when it reaches its total. Shared with the assistant.
 */
export async function logLearningProgress(repo: Repository, resource: LearningResource, amount: number) {
  const next = resource.total ? Math.min(resource.total, resource.progress + amount) : resource.progress + amount;
  const finished = resource.total !== null && next >= resource.total;
  const updated = await repo.learning.update(resource.id, {
    progress: next,
    ...(finished ? { status: 'completed' as const } : resource.status === 'planned' ? { status: 'active' as const } : {}),
  });
  await repo.activities.create({
    domain: 'intellectual',
    kind: resource.kind === 'book' || resource.kind === 'article' ? 'reading' : 'course',
    title: resource.title,
    value: next - resource.progress,
    unit: resource.unit,
    notes: null,
    details: { resourceId: resource.id },
    goalId: null,
  });
  return { updated, finished };
}

