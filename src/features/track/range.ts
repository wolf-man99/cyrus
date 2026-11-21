import { addDays, today, type ISODate } from '@/lib/dates';
import { bucketFor, type Bucket } from '@/domain/series';

export type RangeKey = '7d' | '30d' | '90d' | '1y';

export const RANGE_OPTIONS: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: '1y', label: '1Y', days: 365 },
];

export interface TrackRange {
  key: RangeKey;
  from: ISODate;
  to: ISODate;
  days: number;
  bucket: Bucket;
  /** Human label for comparisons, e.g. "last 30 days". */
  label: string;
}

export function trackRange(key: RangeKey, end: ISODate = today()): TrackRange {
  const days = RANGE_OPTIONS.find((r) => r.value === key)!.days;
  return {
    key,
    from: addDays(end, -(days - 1)),
    to: end,
    days,
    bucket: bucketFor(days),
    label: key === '1y' ? 'last 12 months' : `last ${days} days`,
  };
}
