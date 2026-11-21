import type { ReflectionPeriod } from './types';

export interface ReflectionPrompt {
  id: string;
  label: string;
  placeholder: string;
}

export interface ReflectionTemplate {
  period: ReflectionPeriod;
  title: string;
  cadence: string;
  /** Whether mood / energy are captured. */
  checkIn: boolean;
  prompts: ReflectionPrompt[];
  /** Data-driven summaries CYRUS assembles for this review. */
  insights: string[];
}

/** Config-driven reflection templates. The Reflect section renders these generically. */
export const REFLECTION_TEMPLATES: Record<ReflectionPeriod, ReflectionTemplate> = {
  daily: {
    period: 'daily',
    title: 'Daily review',
    cadence: 'Every evening · 2 min',
    checkIn: true,
    prompts: [
      { id: 'accomplishments', label: 'Accomplishments', placeholder: 'What did you get done today?' },
      { id: 'missed', label: 'Missed commitments', placeholder: 'What slipped, and why?' },
      { id: 'challenges', label: 'Challenges', placeholder: 'What was hard today?' },
      { id: 'tomorrow', label: 'Improvements for tomorrow', placeholder: 'One thing to do better tomorrow' },
    ],
    insights: ['Tasks completed', 'Habits kept'],
  },
  weekly: {
    period: 'weekly',
    title: 'Weekly review',
    cadence: 'Sundays · 5 min',
    checkIn: false,
    prompts: [
      { id: 'progress', label: 'Progress', placeholder: 'Where did you move forward this week?' },
      { id: 'neglected', label: 'Neglected areas', placeholder: 'Which life domains got no attention?' },
      { id: 'priorities', label: "Next week's priorities", placeholder: 'Top three priorities for next week' },
    ],
    insights: ['Consistency', 'Neglected domains'],
  },
  monthly: {
    period: 'monthly',
    title: 'Monthly review',
    cadence: 'Month end · 10 min',
    checkIn: false,
    prompts: [
      { id: 'achievements', label: 'Key achievements', placeholder: 'What are you proud of this month?' },
      { id: 'improvements', label: 'Improvements', placeholder: 'What will you change next month?' },
    ],
    insights: ['Life-domain progress', 'Financial summary', 'Health & fitness trends'],
  },
};
