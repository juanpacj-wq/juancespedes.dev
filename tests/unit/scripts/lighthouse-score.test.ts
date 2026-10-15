import { describe, expect, it } from 'vitest';

import {
  CURVES,
  logNormalScore,
  performanceScore,
} from '../../../scripts/lib/lighthouse-score.mjs';

describe('Lighthouse score estimate', () => {
  it('scores 0.9 at a curve p10 and 0.5 at its median', () => {
    expect(logNormalScore(CURVES.lcp, CURVES.lcp.p10)).toBeCloseTo(0.9, 3);
    expect(logNormalScore(CURVES.lcp, CURVES.lcp.median)).toBeCloseTo(0.5, 3);
    expect(logNormalScore(CURVES.cls, 0)).toBe(1);
  });

  // Metrics and scores from CI's own reports (PR #39): the estimate has to land where CI did.
  it('reproduces the scores CI reported', () => {
    const main = { fcp: 1830, si: 1830, lcp: 2430, tbt: 0, cls: 0.046 };
    const firstRound = { fcp: 2500, si: 2500, lcp: 2880, tbt: 0, cls: 0.08 };
    const home = { fcp: 2132, si: 2132, lcp: 2582, tbt: 0, cls: 0 };
    expect(performanceScore(main)).toBeCloseTo(0.965, 2);
    expect(performanceScore(firstRound)).toBeCloseTo(0.905, 2);
    expect(performanceScore(home)).toBeCloseTo(0.95, 2);
  });
});
