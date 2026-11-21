import type { ReflectionPeriod } from './types';

/**
 * What a step shows alongside its prompt, built from the user's own data for that period,
 * so reflections connect to real tasks, habits, goals and activity.
 */
export type StepContext =
  | 'done_tasks'
  | 'missed_tasks'
  | 'habits'
  | 'domains'
  | 'health'
  | 'money'
  | 'career'
  | 'business'
  | 'goals_progressed'
  | 'neglected';

export type ReflectionStep =
  | { id: string; type: 'text'; prompt: string; placeholder: string; context?: StepContext }
  | { id: 'checkin'; type: 'checkin'; prompt: string }
  | { id: 'domains'; type: 'domains'; prompt: string }
  | { id: 'goals'; type: 'goals'; prompt: string };

export interface ReflectionTemplate {
  period: ReflectionPeriod;
  title: string;
  /** Roughly how long it takes. */
  duration: string;
  steps: ReflectionStep[];
}

const text = (id: string, prompt: string, placeholder: string, context?: StepContext): ReflectionStep => ({
  id,
  type: 'text',
  prompt,
  placeholder,
  context,
});

/** Config-driven reflection templates. One short prompt per step; every step can be skipped. */
export const REFLECTION_TEMPLATES: Record<ReflectionPeriod, ReflectionTemplate> = {
  daily: {
    period: 'daily',
    title: 'Daily reflection',
    duration: '2 min',
    steps: [
      text('went_well', 'What went well today?', 'One thing is enough'),
      text('accomplished', 'What did you accomplish?', 'Big or small', 'done_tasks'),
      text('incomplete', 'What didn’t get done?', 'And why, if you know', 'missed_tasks'),
      { id: 'checkin', type: 'checkin', prompt: 'How was your mood and energy?' },
      text('distractions', 'What distracted you?', 'Phone, meetings, worries…'),
      text('improve', 'What will you do better tomorrow?', 'One concrete change'),
    ],
  },
  weekly: {
    period: 'weekly',
    title: 'Weekly review',
    duration: '5 min',
    steps: [
      text('achievements', 'What were your biggest achievements?', 'What moved forward this week', 'goals_progressed'),
      text('missed', 'Which commitments did you miss?', 'Be honest, not harsh', 'missed_tasks'),
      { id: 'domains', type: 'domains', prompt: 'How did each area of life go?' },
      text('consistency', 'What patterns do you notice in your consistency?', 'Which habits held, which slipped', 'habits'),
      text('challenges', 'What was the biggest challenge?', 'What got in the way'),
      text('lessons', 'What did you learn?', 'A lesson you want to keep'),
      text('priorities', 'What are next week’s priorities?', 'Three at most', 'neglected'),
      { id: 'goals', type: 'goals', prompt: 'Which goals did this week touch?' },
    ],
  },
  monthly: {
    period: 'monthly',
    title: 'Monthly review',
    duration: '10 min',
    steps: [
      text('overall', 'How did the month go overall?', 'The headline, in a sentence or two'),
      { id: 'domains', type: 'domains', prompt: 'How did each area of life perform?' },
      text('health', 'How are your health and fitness trending?', 'Weight, training, sleep, energy', 'health'),
      text('financial', 'How did your finances go?', 'Spending, saving, investing', 'money'),
      text('career', 'What progress did you make in your career?', 'Projects, skills, recognition', 'career'),
      text('entrepreneurship', 'What happened with your business ideas and ventures?', 'Revenue, experiments, learnings', 'business'),
      text('achievements', 'What were your major achievements?', 'What you are proud of', 'goals_progressed'),
      text('attention', 'Which areas need attention?', 'Where to put more energy next month', 'neglected'),
      text('priorities', 'What are next month’s priorities?', 'Three at most'),
      { id: 'goals', type: 'goals', prompt: 'Which goals did this month touch?' },
    ],
  },
};

/** Text prompt for a stored response key, for showing past reflections. */
export function promptFor(period: ReflectionPeriod, key: string): string {
  const step = REFLECTION_TEMPLATES[period].steps.find((s) => s.id === key);
  return step?.prompt ?? key.replace(/_/g, ' ');
}
