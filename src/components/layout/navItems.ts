import { NotebookPen, Orbit, Sun, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** Lucide icon, or `'orb'` for the Cyrus assistant. */
  icon: LucideIcon | 'orb';
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun, end: true },
  { to: '/track', label: 'Track', icon: Orbit },
  { to: '/reflect', label: 'Reflect', icon: NotebookPen },
  { to: '/cyrus', label: 'Cyrus', icon: 'orb' },
];
