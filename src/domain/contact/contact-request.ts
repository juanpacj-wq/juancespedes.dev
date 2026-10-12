import { err, ok, type Result } from '../shared/result';

/** Raw values from the contact form, untrusted. */
export interface ContactRequestInput {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly consent: boolean;
}

/** A contact request that passed every rule; safe to deliver. */
export interface ContactRequest {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export type ContactField = 'name' | 'email' | 'message' | 'consent';

export type ContactIssueCode =
  'required' | 'too-short' | 'too-long' | 'invalid-email' | 'consent-required';

/** Issues carry codes, not sentences: the interface translates them per locale. */
export interface ContactFieldIssue {
  readonly field: ContactField;
  readonly code: ContactIssueCode;
}

export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  message: { min: 20, max: 5000 },
} as const;

// Pragmatic address check: one @, no spaces, a dot in the domain. Delivery is the real test.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lengthIssue = (field: 'name' | 'message', value: string): ContactFieldIssue | null => {
  const { min, max } = CONTACT_LIMITS[field];
  if (value === '') return { field, code: 'required' };
  if (value.length < min) return { field, code: 'too-short' };
  if (value.length > max) return { field, code: 'too-long' };
  return null;
};

const emailIssue = (value: string): ContactFieldIssue | null => {
  if (value === '') return { field: 'email', code: 'required' };
  if (value.length > CONTACT_LIMITS.email.max) return { field: 'email', code: 'too-long' };
  if (!EMAIL_PATTERN.test(value)) return { field: 'email', code: 'invalid-email' };
  return null;
};

/**
 * Validates and normalizes a contact request. Runs in the browser for instant feedback and on
 * the server as the authority, so both always agree.
 */
export const validateContactRequest = (
  input: ContactRequestInput,
): Result<ContactRequest, readonly ContactFieldIssue[]> => {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();

  const issues = [
    lengthIssue('name', name),
    emailIssue(email),
    lengthIssue('message', message),
    input.consent ? null : ({ field: 'consent', code: 'consent-required' } as const),
  ].filter((issue): issue is ContactFieldIssue => issue !== null);

  return issues.length > 0 ? err(issues) : ok({ name, email, message });
};
