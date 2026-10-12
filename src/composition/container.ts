import { APP_VERSION } from 'astro:env/server';

import { makeGetHealthStatus } from '../application/use-cases/get-health-status';
import { systemClock } from '../infrastructure/system/system-clock';

/**
 * Composition root: the only place where use cases meet their adapters.
 * Pages ask the container for a use case; they never build adapters themselves.
 */
export const container = {
  getHealthStatus: makeGetHealthStatus({ clock: systemClock, version: APP_VERSION }),
} as const;
