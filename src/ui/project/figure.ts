import type { Locale } from '../../domain/shared/locale';

/*
 * Headline figures count up when they scroll into view. A figure is written by hand and
 * localized ("1.400+", "38 de 39", "300 MB a 5 MB"), so only one number in it moves: the first
 * one that is not zero. Everything around it stays exactly as written, and the last frame is the
 * original text.
 */

export interface CountingFigure {
  readonly prefix: string;
  readonly target: number;
  readonly decimals: number;
  /** Whether the written number groups thousands ("1.400"), so the frames do too. */
  readonly grouped: boolean;
  readonly suffix: string;
}

const SEPARATORS: Readonly<Record<Locale, { group: string; decimal: string }>> = {
  es: { group: '.', decimal: ',' },
  en: { group: ',', decimal: '.' },
};

const NUMBER = /\d+(?:[.,]\d+)*/g;

/** Reads one written number in the locale's notation, or null if it is not one. */
const readNumber = (
  text: string,
  locale: Locale,
): { value: number; decimals: number; grouped: boolean } | null => {
  const { group, decimal } = SEPARATORS[locale];
  const [whole = '', fraction = '', extra] = text.split(decimal);
  if (extra !== undefined) return null;
  const groups = whole.split(group);
  const grouped = groups.length > 1;
  // "1.400" groups thousands; "1.4" in Spanish is not a number we know how to read.
  if (grouped && groups.slice(1).some((part) => part.length !== 3)) return null;
  const digits = groups.join('');
  if (!/^\d+$/.test(digits) || (fraction !== '' && !/^\d+$/.test(fraction))) return null;
  return { value: Number(`${digits}.${fraction || '0'}`), decimals: fraction.length, grouped };
};

/** Finds the number that counts up, or null when the figure has nothing to count. */
export const parseFigure = (value: string, locale: Locale): CountingFigure | null => {
  for (const match of value.matchAll(NUMBER)) {
    const number = readNumber(match[0], locale);
    if (!number || number.value === 0) continue;
    return {
      prefix: value.slice(0, match.index),
      target: number.value,
      decimals: number.decimals,
      grouped: number.grouped,
      suffix: value.slice(match.index + match[0].length),
    };
  }
  return null;
};

/** Writes one frame of the count: the figure with `current` in place of its number. */
export const formatFigure = (figure: CountingFigure, current: number, locale: Locale): string => {
  const { group, decimal } = SEPARATORS[locale];
  const [whole = '0', fraction] = current.toFixed(figure.decimals).split('.');
  const digits = figure.grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, group) : whole;
  return `${figure.prefix}${digits}${fraction ? `${decimal}${fraction}` : ''}${figure.suffix}`;
};
