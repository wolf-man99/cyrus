import {
  Apple,
  BookOpen,
  Brain,
  Droplet,
  Dumbbell,
  Footprints,
  MessagesSquare,
  Moon,
  PenLine,
  PiggyBank,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { HabitIcon } from '@/domain/types';

export const HABIT_ICON_COMPONENTS: Record<HabitIcon, LucideIcon> = {
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  footprints: Footprints,
  droplet: Droplet,
  'book-open': BookOpen,
  brain: Brain,
  'pen-line': PenLine,
  moon: Moon,
  apple: Apple,
  'piggy-bank': PiggyBank,
  'messages-square': MessagesSquare,
  sun: Sun,
};
