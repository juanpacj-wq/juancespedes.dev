/**
 * A measurable result. Every number published on the site must say where it comes from,
 * so `source` is mandatory (an audit report, a dashboard, a release note).
 */
export interface Metric {
  readonly value: string;
  readonly label: string;
  readonly source: string;
}

export interface MetricIssue {
  readonly field: 'value' | 'label' | 'source';
  readonly message: string;
}

export const validateMetric = (metric: Metric): readonly MetricIssue[] =>
  (['value', 'label', 'source'] as const)
    .filter((field) => metric[field].trim() === '')
    .map((field) => ({ field, message: `metric ${field} must not be blank` }));
