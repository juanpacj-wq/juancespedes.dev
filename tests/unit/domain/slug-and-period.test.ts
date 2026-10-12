import { describe, expect, it } from 'vitest';

import { parseSlug } from '../../../src/domain/shared/slug';
import {
  compareByRecency,
  isOngoing,
  parseYearMonth,
  type Period,
  type YearMonth,
} from '../../../src/domain/shared/year-month';

const ym = (value: string): YearMonth => {
  const parsed = parseYearMonth(value);
  if (!parsed.ok) throw new Error(value);
  return parsed.value;
};

describe('parseSlug', () => {
  it.each(['operations-logbook', 'a', 'report-2026'])('accepts "%s"', (value) => {
    expect(parseSlug(value).ok).toBe(true);
  });

  it.each(['Operations', 'double--dash', '-leading', 'trailing-', 'with space', 'x'.repeat(61)])(
    'rejects "%s"',
    (value) => {
      expect(parseSlug(value)).toEqual({
        ok: false,
        error: { kind: 'invalid-slug', received: value },
      });
    },
  );
});

describe('parseYearMonth', () => {
  it('accepts ISO months', () => {
    expect(parseYearMonth('2026-03')).toEqual({ ok: true, value: '2026-03' });
  });

  it.each(['2026-13', '2026-3', '26-03', '2026-03-01'])('rejects "%s"', (value) => {
    expect(parseYearMonth(value).ok).toBe(false);
  });
});

describe('compareByRecency', () => {
  const ongoing: Period = { start: ym('2025-01'), end: null };
  const recent: Period = { start: ym('2025-06'), end: ym('2026-08') };
  const older: Period = { start: ym('2024-01'), end: ym('2025-02') };
  const sameEndLaterStart: Period = { start: ym('2025-09'), end: ym('2026-08') };

  it('puts ongoing work first, then the latest end month, then the latest start', () => {
    const sorted = [older, recent, ongoing, sameEndLaterStart].sort(compareByRecency);
    expect(sorted).toEqual([ongoing, sameEndLaterStart, recent, older]);
  });

  it('treats two ongoing periods by start month', () => {
    const laterOngoing: Period = { start: ym('2026-01'), end: null };
    expect([ongoing, laterOngoing].sort(compareByRecency)).toEqual([laterOngoing, ongoing]);
  });

  it('knows when a period is ongoing', () => {
    expect(isOngoing(ongoing)).toBe(true);
    expect(isOngoing(recent)).toBe(false);
  });
});
