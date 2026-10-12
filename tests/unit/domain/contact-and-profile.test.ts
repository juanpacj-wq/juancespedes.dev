import { describe, expect, it } from 'vitest';

import { validateContactRequest } from '../../../src/domain/contact/contact-request';
import { sortByRecency } from '../../../src/domain/profile/profile';
import type { Period, YearMonth } from '../../../src/domain/shared/year-month';

const valid = {
  name: '  Ana   María  ',
  email: '  Ana@Empresa.COM ',
  message: 'Necesito un tablero de Power BI para ventas.',
  consent: true,
};

describe('validateContactRequest', () => {
  it('normalizes whitespace and email case', () => {
    expect(validateContactRequest(valid)).toEqual({
      ok: true,
      value: {
        name: 'Ana María',
        email: 'ana@empresa.com',
        message: 'Necesito un tablero de Power BI para ventas.',
      },
    });
  });

  it('reports every issue at once, as codes', () => {
    const result = validateContactRequest({
      name: '',
      email: 'nope',
      message: 'hola',
      consent: false,
    });
    expect(result).toEqual({
      ok: false,
      error: [
        { field: 'name', code: 'required' },
        { field: 'email', code: 'invalid-email' },
        { field: 'message', code: 'too-short' },
        { field: 'consent', code: 'consent-required' },
      ],
    });
  });

  it.each([
    [{ name: 'A' }, { field: 'name', code: 'too-short' }],
    [{ name: 'x'.repeat(101) }, { field: 'name', code: 'too-long' }],
    [{ email: '' }, { field: 'email', code: 'required' }],
    [{ email: `${'a'.repeat(250)}@b.co` }, { field: 'email', code: 'too-long' }],
    [{ email: 'a b@c.co' }, { field: 'email', code: 'invalid-email' }],
    [{ message: '' }, { field: 'message', code: 'required' }],
    [{ message: 'x'.repeat(5001) }, { field: 'message', code: 'too-long' }],
  ])('flags %o', (override, issue) => {
    const result = validateContactRequest({ ...valid, ...override });
    expect(result.ok ? [] : result.error).toEqual([issue]);
  });
});

describe('sortByRecency', () => {
  const period = (start: string, end: string | null): Period => ({
    start: start as YearMonth,
    end: end as YearMonth | null,
  });

  it('puts ongoing work first, then the latest finished', () => {
    const items = [
      { id: 'old', period: period('2018-01', '2019-01') },
      { id: 'now', period: period('2024-07', null) },
      { id: 'recent', period: period('2020-01', '2024-11') },
    ];
    expect(sortByRecency(items).map((item) => item.id)).toEqual(['now', 'recent', 'old']);
  });
});
