import { err, ok, type Result } from './result';

declare const yearMonthBrand: unique symbol;

/** Calendar month in ISO form `YYYY-MM`. Projects are dated to the month, never to the day. */
export type YearMonth = string & { readonly [yearMonthBrand]: true };

export interface InvalidYearMonth {
  readonly kind: 'invalid-year-month';
  readonly received: string;
}

const PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const parseYearMonth = (value: string): Result<YearMonth, InvalidYearMonth> =>
  PATTERN.test(value)
    ? ok(value as YearMonth)
    : err({ kind: 'invalid-year-month', received: value });

/** Negative when `a` is earlier than `b`. The ISO format makes string order equal to time order. */
export const compareYearMonth = (a: YearMonth, b: YearMonth): number => a.localeCompare(b);

/** A span of months; `end: null` means the work is ongoing. */
export interface Period {
  readonly start: YearMonth;
  readonly end: YearMonth | null;
}

export const isOngoing = (period: Period): boolean => period.end === null;

/**
 * Orders periods from most recent to oldest: ongoing work first, then by end month,
 * then by start month.
 */
export const compareByRecency = (a: Period, b: Period): number => {
  if (a.end === null && b.end !== null) return -1;
  if (a.end !== null && b.end === null) return 1;
  if (a.end !== null && b.end !== null && a.end !== b.end) return compareYearMonth(b.end, a.end);
  return compareYearMonth(b.start, a.start);
};
