import { describe, expect, it } from 'vitest';
import { addDays, diffInDays, dayPart, parseISODate, relativeDayLabel, toISODate } from './dates';

describe('dates', () => {
  it('round-trips local ISO dates', () => {
    expect(toISODate(parseISODate('2026-11-21'))).toBe('2026-11-21');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diffs calendar days', () => {
    expect(diffInDays('2026-11-23', '2026-11-21')).toBe(2);
  });

  it('labels nearby days', () => {
    expect(relativeDayLabel('2026-11-21', '2026-11-21')).toBe('Today');
    expect(relativeDayLabel('2026-11-22', '2026-11-21')).toBe('Tomorrow');
    expect(relativeDayLabel('2026-11-20', '2026-11-21')).toBe('Yesterday');
  });

  it('maps hours to parts of the day', () => {
    const at = (h: number) => new Date(2026, 10, 21, h);
    expect(dayPart(at(8))).toBe('morning');
    expect(dayPart(at(13))).toBe('afternoon');
    expect(dayPart(at(19))).toBe('evening');
    expect(dayPart(at(2))).toBe('night');
  });
});
