import type { Clock } from '../ports/clock';

export interface HealthStatus {
  readonly status: 'ok';
  readonly version: string;
  readonly checkedAt: string;
}

export interface GetHealthStatusDeps {
  readonly clock: Clock;
  readonly version: string;
}

/**
 * Liveness report for GET /api/health. The site has no database or queues,
 * so "ok" means the worker is running the expected version.
 */
export const makeGetHealthStatus =
  ({ clock, version }: GetHealthStatusDeps) =>
  (): HealthStatus => ({
    status: 'ok',
    version: version.trim() === '' ? 'unknown' : version,
    checkedAt: clock.now().toISOString(),
  });
