import { describe, expect, it } from 'vitest';
import { expenseEntrySchema, newTaskSchema, parseDecimal, weightEntrySchema, workoutEntrySchema } from './schemas';

describe('parseDecimal', () => {
  it('accepts dot and comma decimals', () => {
    expect(parseDecimal('78.4')).toBe(78.4);
    expect(parseDecimal('78,4')).toBe(78.4);
    expect(parseDecimal(' 12 ')).toBe(12);
  });
  it('rejects junk', () => {
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('1.2.3')).toBeNaN();
    expect(parseDecimal('-5')).toBeNaN();
  });
});

describe('weightEntrySchema', () => {
  it('accepts one decimal place', () => {
    expect(weightEntrySchema.safeParse({ value: 78.4, unit: 'kg' }).success).toBe(true);
  });
  it('rejects zero, absurd values and two decimals', () => {
    expect(weightEntrySchema.safeParse({ value: 0, unit: 'kg' }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ value: 1200, unit: 'kg' }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ value: 78.45, unit: 'kg' }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ value: Number.NaN, unit: 'kg' }).success).toBe(false);
  });
});

describe('expenseEntrySchema', () => {
  const base = { category: 'Food', note: null, currency: 'USD' };
  it('accepts cents', () => {
    expect(expenseEntrySchema.safeParse({ ...base, amount: 12.5 }).success).toBe(true);
    expect(expenseEntrySchema.safeParse({ ...base, amount: 0.1 + 0.2 }).success).toBe(true);
  });
  it('rejects sub-cent amounts and unknown categories', () => {
    expect(expenseEntrySchema.safeParse({ ...base, amount: 1.234 }).success).toBe(false);
    expect(expenseEntrySchema.safeParse({ ...base, amount: 5, category: 'Crypto' }).success).toBe(false);
  });
});

describe('newTaskSchema', () => {
  it('trims titles and defaults optional fields', () => {
    const parsed = newTaskSchema.parse({ title: '  Ship it  ', dueDate: '2026-11-21' });
    expect(parsed).toMatchObject({ title: 'Ship it', isPriority: false, dueTime: null, domain: null, notes: null });
  });
  it('rejects empty titles and bad times', () => {
    expect(newTaskSchema.safeParse({ title: '   ', dueDate: '2026-11-21' }).success).toBe(false);
    expect(newTaskSchema.safeParse({ title: 'x', dueDate: '2026-11-21', dueTime: '25:00' }).success).toBe(false);
  });
});

describe('workoutEntrySchema', () => {
  it('requires a type and whole minutes', () => {
    expect(workoutEntrySchema.safeParse({ workoutType: 'Run', durationMin: 30 }).success).toBe(true);
    expect(workoutEntrySchema.safeParse({ durationMin: 30 }).success).toBe(false);
    expect(workoutEntrySchema.safeParse({ workoutType: 'Run', durationMin: 12.5 }).success).toBe(false);
  });
});
