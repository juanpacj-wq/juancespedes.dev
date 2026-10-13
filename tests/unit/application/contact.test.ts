import { describe, expect, it, vi } from 'vitest';

import type { Clock } from '../../../src/application/ports/clock';
import type {
  ContactGateway,
  HumanVerifier,
  RateLimiter,
} from '../../../src/application/ports/contact';
import type { ProfileRepository } from '../../../src/application/ports/profile-repository';
import { makeGetProfile } from '../../../src/application/use-cases/get-profile';
import {
  makeSubmitContactRequest,
  type ContactSubmission,
} from '../../../src/application/use-cases/submit-contact-request';
import type { Profile } from '../../../src/domain/profile/profile';
import type { YearMonth } from '../../../src/domain/shared/year-month';

const NOW = new Date('2026-10-12T15:00:00.000Z');
const clock: Clock = { now: () => NOW };

const submission: ContactSubmission = {
  name: 'Ana',
  email: 'ana@empresa.com',
  message: 'Necesito automatizar la conciliación de facturas.',
  consent: true,
  locale: 'es',
  humanToken: 'token',
  honeypot: '',
  remoteIp: '203.0.113.7',
};

const setup = (
  overrides: { allow?: boolean; human?: boolean; deliver?: () => Promise<void> } = {},
) => {
  const deliver = vi.fn(overrides.deliver ?? (() => Promise.resolve()));
  const verify = vi.fn(() => Promise.resolve(overrides.human ?? true));
  const allow = vi.fn(() => Promise.resolve(overrides.allow ?? true));
  const gateway: ContactGateway = { deliver };
  const verifier: HumanVerifier = { verify };
  const rateLimiter: RateLimiter = { allow };
  const submit = makeSubmitContactRequest({ gateway, verifier, rateLimiter, clock });
  return { submit, deliver, verify, allow };
};

describe('submitContactRequest', () => {
  it('delivers a valid, verified request with its metadata', async () => {
    const { submit, deliver, verify, allow } = setup();

    expect(await submit(submission)).toEqual({ ok: true, value: undefined });
    expect(allow).toHaveBeenCalledWith('203.0.113.7');
    expect(verify).toHaveBeenCalledWith('token', '203.0.113.7');
    expect(deliver).toHaveBeenCalledWith(
      { name: 'Ana', email: 'ana@empresa.com', message: submission.message },
      { locale: 'es', receivedAt: NOW },
    );
  });

  it('pretends success for a filled honeypot and does nothing else', async () => {
    const { submit, deliver, allow } = setup();
    expect((await submit({ ...submission, honeypot: 'http://spam' })).ok).toBe(true);
    expect(allow).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it('stops rate-limited callers before any other work', async () => {
    const { submit, verify } = setup({ allow: false });
    expect(await submit({ ...submission, remoteIp: null })).toEqual({
      ok: false,
      error: { kind: 'rate-limited' },
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it('returns field issues before spending a CAPTCHA verification', async () => {
    const { submit, verify } = setup();
    const result = await submit({ ...submission, email: 'nope' });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid', issues: [{ field: 'email', code: 'invalid-email' }] },
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it('refuses unverified senders', async () => {
    const { submit, deliver } = setup({ human: false });
    expect(await submit(submission)).toEqual({ ok: false, error: { kind: 'verification-failed' } });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('reports delivery failures with their cause', async () => {
    const boom = new Error('smtp down');
    const { submit } = setup({ deliver: () => Promise.reject(boom) });
    expect(await submit(submission)).toEqual({
      ok: false,
      error: { kind: 'delivery-failed', cause: boom },
    });
  });
});

describe('getProfile', () => {
  const ym = (value: string) => value as YearMonth;
  const profile: Profile = {
    experience: [
      {
        organization: 'Old',
        role: 'r',
        location: 'l',
        summary: 's',
        highlights: ['h'],
        period: { start: ym('2018-01'), end: ym('2019-01') },
      },
      {
        organization: 'Now',
        role: 'r',
        location: 'l',
        summary: 's',
        highlights: ['h'],
        period: { start: ym('2024-07'), end: null },
      },
    ],
    education: [
      { institution: 'U', degree: 'D', period: { start: ym('2020-01'), end: ym('2024-11') } },
    ],
    credentials: [],
    services: [],
    process: [],
    currency: 'USD',
    pricing: 'Quoted',
  };
  const repository: ProfileRepository = { get: () => Promise.resolve(profile) };

  it('orders the work history from the most recent', async () => {
    const result = await makeGetProfile(repository)('en');
    expect(result.experience.map((job) => job.organization)).toEqual(['Now', 'Old']);
    expect(result.pricing).toBe('Quoted');
  });
});
