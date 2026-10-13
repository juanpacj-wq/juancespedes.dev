import { err, ok, type Result } from './result';

declare const isoDateBrand: unique symbol;

/** A calendar day in ISO form `YYYY-MM-DD`, checked against the real calendar. */
export type IsoDate = string & { readonly [isoDateBrand]: true };

export interface InvalidIsoDate {
  readonly kind: 'invalid-iso-date';
  readonly received: string;
}

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseIsoDate = (value: string): Result<IsoDate, InvalidIsoDate> => {
  const match = PATTERN.exec(value);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    // Rejects 2026-02-30 and friends: the date must survive a round trip unchanged.
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return ok(value as IsoDate);
    }
  }
  return err({ kind: 'invalid-iso-date', received: value });
};

/** Negative when `a` is earlier than `b`; the ISO format makes string order equal time order. */
export const compareIsoDate = (a: IsoDate, b: IsoDate): number => a.localeCompare(b);
