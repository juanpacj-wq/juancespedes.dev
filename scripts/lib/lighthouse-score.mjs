// Lighthouse 12's mobile performance score from its five metrics: each metric is scored on a
// log-normal curve (its p10 and median) and the scores are weighted. Used by
// scripts/lighthouse-local.mjs to estimate what CI would score: a busy workstation inflates
// Total Blocking Time, so the estimate is read with TBT set to 0, as CI measures it.
// Curves and weights: lighthouse/core/audits/metrics/*.js and core/config/default-config.js.

export const CURVES = {
  fcp: { p10: 1800, median: 3000, weight: 0.1 },
  si: { p10: 3387, median: 5800, weight: 0.1 },
  lcp: { p10: 2500, median: 4000, weight: 0.25 },
  tbt: { p10: 200, median: 600, weight: 0.3 },
  cls: { p10: 0.1, median: 0.25, weight: 0.25 },
};

// Complementary error function (Numerical Recipes' erfcc, accurate to 1.2e-7).
const COEFFICIENTS = [
  -1.26551223, 1.00002368, 0.37409196, 0.09678418, -0.18628806, 0.27886807, -1.13520398, 1.48851587,
  -0.82215223, 0.17087277,
];
/** @param {number} x */
const erfc = (x) => {
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const polynomial = COEFFICIENTS.reduceRight((sum, coefficient) => coefficient + t * sum, 0);
  const result = t * Math.exp(-z * z + polynomial);
  return x >= 0 ? result : 2 - result;
};

// erfc(x) = 0.2 at this x, which puts a score of 0.9 at p10.
const P10_POINT = 0.9061938024368232;

/**
 * Lighthouse's getLogNormalScore: 0.9 at p10, 0.5 at the median, toward 0 beyond.
 * @param {{ p10: number, median: number }} curve
 * @param {number} value
 */
export const logNormalScore = ({ p10, median }, value) => {
  if (value <= 0) return 1;
  const location = Math.log(median);
  const shape = Math.abs(Math.log(p10) - location) / (Math.SQRT2 * P10_POINT);
  const standardized = (Math.log(value) - location) / (Math.SQRT2 * shape);
  return Math.min(1, Math.max(0, erfc(standardized) / 2));
};

/**
 * The weighted performance score (0 to 1); times in milliseconds, CLS unitless.
 * @param {Record<keyof typeof CURVES, number>} metrics
 */
export const performanceScore = (metrics) =>
  Object.entries(CURVES).reduce(
    (sum, [name, curve]) =>
      sum +
      curve.weight * logNormalScore(curve, metrics[/** @type {keyof typeof CURVES} */ (name)]),
    0,
  );
