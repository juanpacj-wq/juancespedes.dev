import { describe, expect, it } from 'vitest';

import type { Clock } from '../../../src/application/ports/clock';
import { makeGetHealthStatus } from '../../../src/application/use-cases/get-health-status';

const fixedClock: Clock = { now: () => new Date('2026-10-12T15:00:00.000Z') };

describe('getHealthStatus', () => {
  it('reports ok with the running version and the check time', () => {
    const getHealthStatus = makeGetHealthStatus({ clock: fixedClock, version: 'abc1234' });

    expect(getHealthStatus()).toEqual({
      status: 'ok',
      version: 'abc1234',
      checkedAt: '2026-10-12T15:00:00.000Z',
    });
  });

  it('reports "unknown" instead of an empty version', () => {
    const getHealthStatus = makeGetHealthStatus({ clock: fixedClock, version: '  ' });

    expect(getHealthStatus().version).toBe('unknown');
  });
});
