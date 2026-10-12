import type { Locale } from '../../domain/shared/locale';
import type { Period } from '../../domain/shared/year-month';
import type { Dictionary } from './dictionary';

const INTL_LOCALE: Readonly<Record<Locale, string>> = { es: 'es-CO', en: 'en-US' };

/** "jul. 2024" in Spanish, "Jul 2024" in English. Months are UTC so the date never shifts. */
export const formatYearMonth = (locale: Locale, value: string): string => {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1)));
};

/** "jul. 2024 a hoy" / "Jul 2024 to present". */
export const formatPeriod = (locale: Locale, period: Period, t: Dictionary): string =>
  `${formatYearMonth(locale, period.start)} ${t.period.to} ${
    period.end === null ? t.period.present : formatYearMonth(locale, period.end)
  }`;

/** "2026" or "2025 a 2026": compact form for tables. */
export const formatYears = (period: Period, t: Dictionary): string => {
  const start = period.start.slice(0, 4);
  const end = period.end === null ? t.period.present : period.end.slice(0, 4);
  return start === end ? start : `${start} ${t.period.to} ${end}`;
};
