import {
  Activity,
  Brain,
  BriefcaseBusiness,
  GraduationCap,
  Rocket,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { LifeDomain } from './types';

export type DomainSection = 'overview' | 'goals' | 'activities' | 'progress' | 'history';

export const DOMAIN_SECTIONS: { id: DomainSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'goals', label: 'Goals' },
  { id: 'activities', label: 'Activities' },
  { id: 'progress', label: 'Progress' },
  { id: 'history', label: 'History' },
];

export interface LifeDomainConfig {
  id: LifeDomain;
  name: string;
  tagline: string;
  icon: LucideIcon;
  /** CSS colour token for the domain accent. */
  accent: string;
  /** What this domain tracks — drives the domain page modules. */
  areas: string[];
}

export const LIFE_DOMAIN_CONFIG: Record<LifeDomain, LifeDomainConfig> = {
  physical: {
    id: 'physical',
    name: 'Physical',
    tagline: 'Health, body and fitness',
    icon: Activity,
    accent: 'var(--color-physical)',
    areas: ['Health reports', 'Weight', 'Measurements', 'Workouts', 'Fitness goals'],
  },
  mental: {
    id: 'mental',
    name: 'Mental',
    tagline: 'Wellbeing and focus',
    icon: Brain,
    accent: 'var(--color-mental)',
    areas: ['Wellbeing', 'Meditation', 'Journaling', 'Focus'],
  },
  intellectual: {
    id: 'intellectual',
    name: 'Intellectual',
    tagline: 'Reading and learning',
    icon: GraduationCap,
    accent: 'var(--color-intellectual)',
    areas: ['Books', 'Reading', 'Courses', 'Skills', 'Learning'],
  },
  financial: {
    id: 'financial',
    name: 'Financial',
    tagline: 'Money in, money out, net worth',
    icon: Wallet,
    accent: 'var(--color-financial)',
    areas: ['Income', 'Expenses', 'Savings', 'Investments', 'Net worth'],
  },
  social: {
    id: 'social',
    name: 'Social',
    tagline: 'People and communication',
    icon: Users,
    accent: 'var(--color-social)',
    areas: ['Communication', 'Public speaking', 'Relationships'],
  },
  career: {
    id: 'career',
    name: 'Career',
    tagline: 'Professional growth',
    icon: BriefcaseBusiness,
    accent: 'var(--color-career)',
    areas: ['Professional goals', 'Skills', 'Achievements', 'Projects'],
  },
  entrepreneurship: {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    tagline: 'Ideas, ventures and milestones',
    icon: Rocket,
    accent: 'var(--color-entrepreneurship)',
    areas: ['Business ideas', 'Ventures', 'Milestones'],
  },
};

export const LIFE_DOMAIN_LIST: LifeDomainConfig[] = Object.values(LIFE_DOMAIN_CONFIG);

export function isLifeDomain(value: string | undefined): value is LifeDomain {
  return value !== undefined && value in LIFE_DOMAIN_CONFIG;
}
