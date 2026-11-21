import type { Point } from '@/domain/series';
import { parseISODate } from '@/lib/dates';

export interface Series {
  label: string;
  color: string;
  points: Point[];
}

export const shortDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(parseISODate(iso));

export const monthLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(parseISODate(iso));

/** "Nice" rounded domain for an axis. */
export function niceDomain(values: number[], zero = false): [number, number] {
  if (!values.length) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (zero) min = Math.min(0, min);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  return [zero ? min : min - pad, max + pad];
}
