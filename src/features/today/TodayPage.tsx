import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Mic, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { formatLongDate, greeting, today } from '@/lib/dates';
import { dailyProgress } from '@/domain/progress';
import { useProfile } from '@/data/hooks/useProfile';
import { useTasksForDay, useToggleTask, useUpcomingTasks } from '@/data/hooks/useTasks';
import { useHabitsForDay, useToggleHabit } from '@/data/hooks/useHabits';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { useNow } from '@/lib/useNow';
import { TodayHero } from './components/TodayHero';
import { QuickActions, type QuickAction } from './components/QuickActions';
import { CyrusLaunchCard } from './components/CyrusLaunchCard';
import { PrioritiesSection, TasksSection } from './components/TaskSections';
import { HabitsSection } from './components/HabitsSection';
import { UpcomingSection } from './components/UpcomingSection';
import { LogWeightSheet } from './sheets/LogWeightSheet';
import { LogWorkoutSheet } from './sheets/LogWorkoutSheet';
import { LogExpenseSheet } from './sheets/LogExpenseSheet';
import { AddTaskSheet } from './sheets/AddTaskSheet';
import { ManageHabitsSheet } from './sheets/ManageHabitsSheet';

type OpenSheet = QuickAction | 'priority' | 'habits' | null;

/** TODAY — the daily command centre. */
export function TodayPage() {
  const now = useNow();
  const day = today();
  const profile = useProfile();
  const tasks = useTasksForDay(day);
  const upcoming = useUpcomingTasks(day);
  const habits = useHabitsForDay(day);
  const toggleTask = useToggleTask(day);
  const toggleHabit = useToggleHabit(day);
  const feedback = useSaveFeedback();
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const progress = useMemo(
    () => (tasks.data && habits.data ? dailyProgress(tasks.data, habits.data) : null),
    [tasks.data, habits.data],
  );

  const name = profile.data?.displayName;
  const closeSheet = (open: boolean) => !open && setSheet(null);

  const onToggleTask = (task: { id: string }, completed: boolean) =>
    toggleTask.mutate({ id: task.id, completed }, { onError: (err) => feedback.failed(err, 'Couldn’t update task') });

  const onToggleHabit = (habit: { id: string; doneToday: boolean }) =>
    toggleHabit.mutate(
      { habitId: habit.id, done: !habit.doneToday },
      { onError: (err) => feedback.failed(err, 'Couldn’t update habit') },
    );

  return (
    <>
      {/* Top bar — Orbit-style pill + round action */}
      <div className="flex items-center justify-between pt-1 lg:hidden">
        <Link
          to="/cyrus"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary pr-4 pl-3.5 text-subhead font-semibold transition-[background-color,transform] hover:bg-primary-strong active:scale-[0.98]"
        >
          <Mic className="size-4" /> Ask Cyrus
        </Link>
        <IconButton label="Add task" icon={<Plus className="size-5" />} onClick={() => setSheet('task')} />
      </div>

      <header className="mt-6 lg:mt-0 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-subhead font-medium text-muted">{formatLongDate(now)}</p>
          <h1 className="mt-1 font-display text-display font-semibold">
            {greeting(now)}
            {name ? `, ${name}` : ''}
          </h1>
        </div>
        <div className="hidden lg:block">
          <IconButton label="Add task" icon={<Plus className="size-5" />} onClick={() => setSheet('task')} />
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-10 lg:mt-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        {/* Left column: progress, quick actions, assistant */}
        <div className="space-y-8 lg:sticky lg:top-8 lg:self-start">
          <TodayHero progress={progress} />
          <QuickActions onSelect={setSheet} />
          <CyrusLaunchCard />
        </div>

        {/* Right column: the day */}
        <div className="space-y-9">
          <PrioritiesSection
            tasks={tasks.data}
            isPending={tasks.isPending}
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
            day={day}
            onToggle={onToggleTask}
            onAdd={() => setSheet('priority')}
          />
          <HabitsSection
            habits={habits.data}
            isPending={habits.isPending}
            error={habits.isError ? habits.error : null}
            onRetry={() => void habits.refetch()}
            onToggle={onToggleHabit}
            onManage={() => setSheet('habits')}
          />
          <TasksSection
            tasks={tasks.data}
            isPending={tasks.isPending}
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
            day={day}
            onToggle={onToggleTask}
            onAdd={() => setSheet('task')}
          />
          <UpcomingSection
            tasks={upcoming.data}
            isPending={upcoming.isPending}
            error={upcoming.error}
            onRetry={() => void upcoming.refetch()}
          />
        </div>
      </div>

      <LogWeightSheet open={sheet === 'weight'} onOpenChange={closeSheet} />
      <LogWorkoutSheet open={sheet === 'workout'} onOpenChange={closeSheet} />
      <LogExpenseSheet open={sheet === 'expense'} onOpenChange={closeSheet} />
      <AddTaskSheet open={sheet === 'task' || sheet === 'priority'} defaultPriority={sheet === 'priority'} onOpenChange={closeSheet} />
      <ManageHabitsSheet open={sheet === 'habits'} onOpenChange={closeSheet} habits={habits.data ?? []} />
    </>
  );
}
