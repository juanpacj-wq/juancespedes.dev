/**
 * A result told the way a manager would tell it: what changed, by how much and where the
 * evidence is. Achievements sit above single metrics; most point to the case study behind them.
 */

/** What kind of win it is; the interface picks the icon and the label from it. */
export const ACHIEVEMENT_KINDS = [
  'security',
  'performance',
  'efficiency',
  'delivery',
  'reliability',
  'quality',
] as const;

export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

/** A measured amount drawn as a bar: `amount` sets its length, `display` is what is printed. */
export interface Amount {
  readonly amount: number;
  readonly display: string;
  readonly label: string;
}

/**
 * The small chart under the figure, when the figure has a shape worth drawing: a before and
 * after, a breakdown into parts, or progress towards a total.
 */
export type AchievementChart =
  | { readonly kind: 'compare'; readonly before: Amount; readonly after: Amount }
  | { readonly kind: 'breakdown'; readonly items: readonly Amount[] }
  | {
      readonly kind: 'progress';
      readonly done: number;
      readonly total: number;
      readonly label: string;
    };

export interface Achievement {
  readonly id: string;
  readonly order: number;
  readonly kind: AchievementKind;
  /** The headline figure, already localized ("44×", "97 %", "9 días"). */
  readonly value: string;
  readonly title: string;
  readonly summary: string;
  /** Where it happened, in two or three words ("Portal corporativo"). */
  readonly context: string;
  /** Every figure on the site says where it comes from (see Metric). */
  readonly source: string;
  /** Slug of the case study that tells the whole story, when one is published. */
  readonly project: string | null;
  readonly chart: AchievementChart | null;
  /** The achievement shown large. At most one. */
  readonly featured: boolean;
}

export interface AchievementIssue {
  readonly field: 'chart';
  readonly message: string;
}

/** Rules a schema cannot express: a chart must be drawable and agree with itself. */
export const validateAchievementChart = (
  chart: AchievementChart | null,
): readonly AchievementIssue[] => {
  if (chart === null) return [];
  const issue = (message: string): readonly AchievementIssue[] => [{ field: 'chart', message }];
  switch (chart.kind) {
    case 'compare':
      return chart.before.amount === chart.after.amount
        ? issue('a comparison needs two different amounts')
        : [];
    case 'breakdown':
      return chart.items.every((item) => item.amount === 0)
        ? issue('a breakdown needs at least one amount above zero')
        : [];
    case 'progress':
      return chart.done > chart.total ? issue('progress cannot exceed its total') : [];
  }
};

/**
 * Bar lengths as a share (0 to 1) of the largest amount, so the bars of one chart compare
 * honestly with each other.
 */
export const barShares = (amounts: readonly number[]): readonly number[] => {
  const largest = Math.max(0, ...amounts);
  return amounts.map((amount) => (largest === 0 ? 0 : amount / largest));
};

/** Achievements in the author's order, the featured one first. */
export const orderAchievements = (achievements: readonly Achievement[]): readonly Achievement[] =>
  [...achievements].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
