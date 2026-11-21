import { addDays, dateOf, startOfMonth, startOfWeek, type ISODate } from '@/lib/dates';

export interface Point {
  date: ISODate;
  value: number;
}

export type Bucket = 'day' | 'week' | 'month';

/** Groups dated values into day/week/month buckets and sums them. Empty buckets in range are kept as 0. */
export function bucketSum<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue: (item: T) => number,
  bucket: Bucket,
  range: { from: ISODate; to: ISODate },
): Point[] {
  const keyOf = (d: ISODate) => (bucket === 'week' ? startOfWeek(d) : bucket === 'month' ? startOfMonth(d) : d);
  const totals = new Map<ISODate, number>();
  for (let d = keyOf(range.from); d <= range.to; d = next(d, bucket)) totals.set(d, 0);
  for (const item of items) {
    const raw = getDate(item);
    const d = raw.length > 10 ? dateOf(raw) : raw;
    if (d < range.from || d > range.to) continue;
    const k = keyOf(d);
    totals.set(k, (totals.get(k) ?? 0) + getValue(item));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function next(d: ISODate, bucket: Bucket): ISODate {
  if (bucket === 'day') return addDays(d, 1);
  if (bucket === 'week') return addDays(d, 7);
  const [y, m] = d.split('-').map(Number);
  return `${m === 12 ? y! + 1 : y}-${String(m === 12 ? 1 : m! + 1).padStart(2, '0')}-01`;
}

/** Picks a sensible bucket for a range length in days. */
export function bucketFor(days: number): Bucket {
  if (days <= 31) return days <= 14 ? 'day' : 'week';
  if (days <= 120) return 'week';
  return 'month';
}

export interface Trend {
  first: number;
  last: number;
  change: number;
  min: number;
  max: number;
  average: number;
  count: number;
}

/** Summary statistics for a time-ordered series (oldest first). */
export function trend(points: Point[]): Trend | null {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    first: values[0]!,
    last: values.at(-1)!,
    change: values.at(-1)! - values[0]!,
    min: Math.min(...values),
    max: Math.max(...values),
    average: sum / values.length,
    count: values.length,
  };
}

/** Daily average of values per calendar day (e.g. several mood check-ins). */
export function dailyAverage<T>(items: T[], getDate: (i: T) => string, getValue: (i: T) => number): Point[] {
  const days = new Map<ISODate, number[]>();
  for (const i of items) {
    const d = dateOf(getDate(i));
    days.set(d, [...(days.get(d) ?? []), getValue(i)]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vs]) => ({ date, value: vs.reduce((a, b) => a + b, 0) / vs.length }));
}
