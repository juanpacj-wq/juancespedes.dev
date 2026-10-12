import { err, ok, type Result } from './result';

declare const slugBrand: unique symbol;

/** URL-safe identifier in kebab-case, e.g. `operations-logbook`. */
export type Slug = string & { readonly [slugBrand]: true };

export interface InvalidSlug {
  readonly kind: 'invalid-slug';
  readonly received: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LENGTH = 60;

export const parseSlug = (value: string): Result<Slug, InvalidSlug> =>
  SLUG_PATTERN.test(value) && value.length <= MAX_LENGTH
    ? ok(value as Slug)
    : err({ kind: 'invalid-slug', received: value });
