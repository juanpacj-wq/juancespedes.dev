/**
 * Broad areas of work the portfolio is organized around. The order is the display order.
 * Labels are presentation concerns and live in the UI dictionaries, not here.
 */
export const CAPABILITIES = [
  'frontend',
  'backend',
  'data-bi',
  'automation-ai',
  'infrastructure',
  'legacy-systems',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const isCapability = (value: unknown): value is Capability =>
  typeof value === 'string' && (CAPABILITIES as readonly string[]).includes(value);
