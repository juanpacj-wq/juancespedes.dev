import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, parseLocale } from '../../../src/domain/shared/locale';

describe('Locale', () => {
  it('defaults to Spanish', () => {
    expect(DEFAULT_LOCALE).toBe('es');
  });

  it.each(['es', 'en'])('accepts the supported locale "%s"', (value) => {
    expect(isLocale(value)).toBe(true);
  });

  it.each(['fr', '', 'ES ', 42, null])('rejects %p as a locale guard', (value) => {
    expect(isLocale(value)).toBe(false);
  });

  it('normalizes case and whitespace when parsing', () => {
    expect(parseLocale(' EN ')).toEqual({ ok: true, value: 'en' });
  });

  it('returns a typed error for unsupported locales', () => {
    expect(parseLocale('pt')).toEqual({
      ok: false,
      error: { kind: 'unsupported-locale', received: 'pt' },
    });
  });
});
