import { err, ok, type Result } from './result';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

export interface UnsupportedLocale {
  readonly kind: 'unsupported-locale';
  readonly received: string;
}

export const parseLocale = (value: string): Result<Locale, UnsupportedLocale> => {
  const normalized = value.trim().toLowerCase();
  return isLocale(normalized)
    ? ok(normalized)
    : err({ kind: 'unsupported-locale', received: value });
};
