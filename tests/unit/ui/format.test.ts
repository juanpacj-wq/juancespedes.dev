import { describe, expect, it } from 'vitest';

import { formatMoney, formatNumber } from '../../../src/ui/i18n/format';

// Intl separates the currency symbol with a no-break space in Spanish; \s matches it.
describe('money and number formats', () => {
  it('shows pesos without decimals and with dots for thousands in Spanish', () => {
    expect(formatMoney('es', 6_000_000, 'COP')).toMatch(/^\$\s6\.000\.000$/);
  });

  it('shows dollars without decimals and with commas for thousands in English', () => {
    expect(formatMoney('en', 1_500, 'USD')).toBe('$1,500');
  });

  it('rounds to whole amounts', () => {
    expect(formatMoney('en', 99.6, 'USD')).toBe('$100');
  });

  it('groups plain numbers by locale', () => {
    expect(formatNumber('es', 10_527)).toBe('10.527');
    expect(formatNumber('en', 10_527)).toBe('10,527');
  });
});
