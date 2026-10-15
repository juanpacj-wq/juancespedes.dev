import { describe, expect, it } from 'vitest';

import {
  barShares,
  orderAchievements,
  validateAchievementChart,
  type Achievement,
  type Amount,
} from '../../../src/domain/project/achievement';

const amount = (value: number): Amount => ({ amount: value, display: String(value), label: 'x' });

const achievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'a',
  order: 1,
  kind: 'security',
  value: '0',
  title: 'Title',
  summary: 'Summary',
  context: 'Context',
  source: 'Source',
  project: null,
  chart: null,
  featured: false,
  ...overrides,
});

describe('barShares', () => {
  it('measures every bar against the largest amount', () => {
    expect(barShares([1100, 25])).toEqual([1, 25 / 1100]);
    expect(barShares([0, 0, 3])).toEqual([0, 0, 1]);
  });

  it('draws nothing when every amount is zero', () => {
    expect(barShares([0, 0])).toEqual([0, 0]);
    expect(barShares([])).toEqual([]);
  });
});

describe('validateAchievementChart', () => {
  it('accepts no chart and charts that agree with themselves', () => {
    expect(validateAchievementChart(null)).toEqual([]);
    expect(
      validateAchievementChart({ kind: 'compare', before: amount(300), after: amount(5) }),
    ).toEqual([]);
    expect(validateAchievementChart({ kind: 'breakdown', items: [amount(0), amount(3)] })).toEqual(
      [],
    );
    expect(
      validateAchievementChart({ kind: 'progress', done: 38, total: 39, label: 'closed' }),
    ).toEqual([]);
  });

  it.each([
    ['a comparison of equal amounts', { kind: 'compare', before: amount(5), after: amount(5) }],
    ['a breakdown with nothing to draw', { kind: 'breakdown', items: [amount(0), amount(0)] }],
    ['progress past its total', { kind: 'progress', done: 40, total: 39, label: 'closed' }],
  ] as const)('rejects %s', (_, chart) => {
    expect(validateAchievementChart(chart).map((issue) => issue.field)).toEqual(['chart']);
  });
});

describe('orderAchievements', () => {
  it('puts the featured achievement first, then follows the author order', () => {
    const ordered = orderAchievements([
      achievement({ id: 'third', order: 3 }),
      achievement({ id: 'featured', order: 9, featured: true }),
      achievement({ id: 'first', order: 1 }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['featured', 'first', 'third']);
  });
});
