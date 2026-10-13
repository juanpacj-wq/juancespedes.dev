import { compareByRecency, type Period } from '../shared/year-month';

/** A job or engagement in the work history. */
export interface Experience {
  readonly organization: string;
  readonly role: string;
  readonly location: string;
  readonly period: Period;
  readonly summary: string;
  readonly highlights: readonly string[];
}

export interface Education {
  readonly institution: string;
  readonly degree: string;
  readonly period: Period;
}

/** A certification or professional license. `url` points to public verification when it exists. */
export interface Credential {
  readonly name: string;
  readonly issuer: string;
  readonly issued: string;
  readonly url: string | null;
}

/** Prices on the site are shown in pesos to Spanish readers and in dollars to English ones. */
export type Currency = 'COP' | 'USD';

/** Something a client can hire: what it is, what they receive and where its price starts. */
export interface Service {
  readonly title: string;
  readonly summary: string;
  readonly deliverables: readonly string[];
  /** A floor, not a quote: "from" this amount, for the scope described in `scope`. */
  readonly price: { readonly from: number; readonly scope: string };
  /** The service shown with emphasis, the core of the work. At most one. */
  readonly featured: boolean;
}

export interface ProcessStep {
  readonly title: string;
  readonly description: string;
}

export interface Profile {
  readonly experience: readonly Experience[];
  readonly education: readonly Education[];
  readonly credentials: readonly Credential[];
  readonly services: readonly Service[];
  readonly process: readonly ProcessStep[];
  /** The currency of every price in this profile. */
  readonly currency: Currency;
  /** How engagements are priced beyond the floors: support, adjustments, what is fixed. */
  readonly pricing: string;
}

/** Work history and education read best from the most recent backwards. */
export const sortByRecency = <T extends { readonly period: Period }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => compareByRecency(a.period, b.period));
