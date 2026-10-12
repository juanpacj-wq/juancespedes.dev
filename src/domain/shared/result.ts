/**
 * Explicit success/failure value used across the domain and application layers.
 * Expected failures (invalid input, missing content) are values, not exceptions.
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
