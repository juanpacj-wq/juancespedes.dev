import { describe, expect, it } from 'vitest';

import {
  CONTACT_LIMITS,
  validateContactRequest,
} from '../../../src/domain/contact/contact-request';
import { validateMetric } from '../../../src/domain/project/metric';
import { validateProjectContent } from '../../../src/domain/project/project';
import {
  compareByRecency,
  parseYearMonth,
  type Period,
  type YearMonth,
} from '../../../src/domain/shared/year-month';
import { caseStudyContent, openSourceContent } from '../../support/project-builders';

/*
 * Tests written from mutation testing (ADR 0014): each one pins a boundary or a branch that the
 * behavioural tests exercised without really checking, so a small change to the rule survived.
 */

const valid = {
  name: 'Ana Pérez',
  email: 'ana@empresa.com',
  message: 'Necesito un tablero de ventas conectado a SQL Server.',
  consent: true,
} as const;

const codes = (input: Parameters<typeof validateContactRequest>[0]) => {
  const result = validateContactRequest(input);
  return result.ok ? [] : result.error.map((issue) => `${issue.field}.${issue.code}`);
};

describe('contact request boundaries', () => {
  it('accepts values exactly at the minimum and maximum lengths', () => {
    expect(codes({ ...valid, name: 'a'.repeat(CONTACT_LIMITS.name.min) })).toEqual([]);
    expect(codes({ ...valid, message: 'm'.repeat(CONTACT_LIMITS.message.min) })).toEqual([]);
    const local = 'a'.repeat(CONTACT_LIMITS.email.max - '@empresa.com'.length);
    expect(codes({ ...valid, email: `${local}@empresa.com` })).toEqual([]);
  });

  it('measures the message after trimming the spaces around it', () => {
    const padded = `   ${'m'.repeat(CONTACT_LIMITS.message.min - 1)}   `;
    expect(codes({ ...valid, message: padded })).toEqual(['message.too-short']);
  });

  it('rejects an address with text after the domain', () => {
    expect(codes({ ...valid, email: 'ana@empresa.com extra' })).toEqual(['email.invalid-email']);
  });
});

describe('project rule messages and boundaries', () => {
  it('explains each issue in words, not only by field', () => {
    expect(validateMetric({ value: '6', label: ' ', source: 'audit' })).toEqual([
      { field: 'label', message: 'metric label must not be blank' },
    ]);
    expect(
      validateProjectContent(caseStudyContent({ problem: ' ', featured: true, metrics: [] })),
    ).toEqual([
      { field: 'metrics', message: 'a featured project needs a measurable result' },
      { field: 'problem', message: 'problem must not be blank' },
    ]);
    expect(validateProjectContent(openSourceContent({ repository: 'ftp://x' }))).toEqual([
      { field: 'repository', message: 'repository must be an https URL' },
    ]);
    expect(
      validateProjectContent(caseStudyContent({ period: { start: '2026-01', end: '26-02' } })),
    ).toEqual([{ field: 'period.end', message: 'expected YYYY-MM or null' }]);
  });

  it('accepts a project that starts and ends in the same month', () => {
    expect(
      validateProjectContent(caseStudyContent({ period: { start: '2026-05', end: '2026-05' } })),
    ).toEqual([]);
  });

  it('accepts https links', () => {
    expect(
      validateProjectContent(
        caseStudyContent({ links: [{ label: 'Site', url: 'https://example.com/path' }] }),
      ),
    ).toEqual([]);
  });
});

describe('year-month boundaries', () => {
  it('rejects text before or after the month and says what it received', () => {
    expect(parseYearMonth('x2026-03')).toEqual({
      ok: false,
      error: { kind: 'invalid-year-month', received: 'x2026-03' },
    });
    expect(parseYearMonth('2026-03x').ok).toBe(false);
  });

  const month = (value: string) => value as YearMonth;
  const period = (start: string, end: string | null): Period => ({
    start: month(start),
    end: end === null ? null : month(end),
  });

  it('puts ongoing work before finished work, in both argument orders', () => {
    expect(compareByRecency(period('2024-01', null), period('2025-01', '2025-06'))).toBeLessThan(0);
    expect(compareByRecency(period('2025-01', '2025-06'), period('2024-01', null))).toBeGreaterThan(
      0,
    );
  });

  it('orders finished work by end month, most recent first', () => {
    const earlier = period('2024-01', '2024-03');
    const later = period('2023-01', '2024-09');
    expect(compareByRecency(later, earlier)).toBeLessThan(0);
    expect(compareByRecency(earlier, later)).toBeGreaterThan(0);
  });

  it('falls back to the start month when both are ongoing or end together', () => {
    expect(compareByRecency(period('2025-02', null), period('2025-01', null))).toBeLessThan(0);
    expect(
      compareByRecency(period('2024-01', '2024-06'), period('2024-03', '2024-06')),
    ).toBeGreaterThan(0);
  });
});
