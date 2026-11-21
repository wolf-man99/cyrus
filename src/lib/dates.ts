/**
 * Date helpers. All "calendar dates" are local `YYYY-MM-DD` strings (ISODate),
 * matching Postgres `date` columns. Times are local `HH:MM`.
 */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffInDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(a).getTime() - parseISODate(b).getTime();
  return Math.round(ms / 86_400_000);
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(date = new Date()): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

export function greeting(date = new Date()): string {
  const part = dayPart(date);
  return part === 'night' ? 'Good night' : `Good ${part}`;
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function formatShortDate(iso: ISODate): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    parseISODate(iso),
  );
}

/** "Today", "Tomorrow", weekday within a week, else short date. */
export function relativeDayLabel(iso: ISODate, from: ISODate = today()): string {
  const diff = diffInDays(iso, from);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(parseISODate(iso));
  }
  return formatShortDate(iso);
}

/** Formats a `HH:MM` 24h string using the user's locale (e.g. "6:30 PM"). */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
}

export function timeAgo(isoDateTime: string, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(isoDateTime).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(-days, 'day');
}

/* ───────────── Periods & ranges ───────────── */

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  const d = parseISODate(iso);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = parseISODate(startOfMonth(iso));
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISODate(startOfMonth(iso));
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export type Period = 'daily' | 'weekly' | 'monthly';

/** Normalises any date to the start of its period. */
export function periodStart(period: Period, iso: ISODate = today()): ISODate {
  if (period === 'weekly') return startOfWeek(iso);
  if (period === 'monthly') return startOfMonth(iso);
  return iso;
}

/** Inclusive date range covered by a period. */
export function periodRange(period: Period, start: ISODate): { from: ISODate; to: ISODate } {
  if (period === 'weekly') return { from: start, to: addDays(start, 6) };
  if (period === 'monthly') return { from: start, to: endOfMonth(start) };
  return { from: start, to: start };
}

export function previousPeriodStart(period: Period, start: ISODate): ISODate {
  if (period === 'weekly') return addDays(start, -7);
  if (period === 'monthly') return addMonths(start, -1);
  return addDays(start, -1);
}

export function formatPeriod(period: Period, start: ISODate): string {
  const d = parseISODate(start);
  if (period === 'monthly') return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d);
  if (period === 'weekly') {
    const end = parseISODate(addDays(start, 6));
    const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
    return `${fmt.format(d)} – ${fmt.format(end)}`;
  }
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

/** Local-midnight timestamp at the start of a day (for timestamptz filters). */
export function dayStartTimestamp(iso: ISODate): string {
  return parseISODate(iso).toISOString();
}

/** Timestamp just after the end of a day: use as an exclusive upper bound. */
export function dayEndTimestamp(iso: ISODate): string {
  return parseISODate(addDays(iso, 1)).toISOString();
}

/** Local calendar date of a timestamp. */
export function dateOf(timestamp: string): ISODate {
  return toISODate(new Date(timestamp));
}

/** "Last N days" range ending today. */
export function lastDays(days: number, end: ISODate = today()): { from: ISODate; to: ISODate } {
  return { from: addDays(end, -(days - 1)), to: end };
}
