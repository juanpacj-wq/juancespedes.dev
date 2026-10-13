import type { Locale } from '../../domain/shared/locale';
import type { Dictionary } from '../../ui/i18n/dictionary';
import { homeSectionPath } from '../../ui/i18n/routes';

/** Header links for pages other than home: they point back to the home page sections. */
export const siteNav = (t: Dictionary, locale: Locale) => [
  { href: homeSectionPath(locale, 'projects'), label: t.nav.projects },
  { href: homeSectionPath(locale, 'capabilities'), label: t.nav.skills },
  { href: homeSectionPath(locale, 'services'), label: t.nav.services },
  { href: homeSectionPath(locale, 'contact'), label: t.nav.contact },
];
