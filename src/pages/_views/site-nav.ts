import { container } from '../../composition/container';
import type { Locale } from '../../domain/shared/locale';
import type { NavItem } from '../../ui/chrome/nav';
import type { Dictionary } from '../../ui/i18n/dictionary';
import { homeSectionPath } from '../../ui/i18n/routes';
import { workMenu } from '../../ui/project/work-menu';

/**
 * Header links for pages other than home: they point back to the home page sections. The
 * projects item opens the projects by area, each leading to its place on the home page.
 */
export const siteNav = async (t: Dictionary, locale: Locale): Promise<readonly NavItem[]> => {
  const projects = await container.listProjects(locale);
  return [
    {
      href: homeSectionPath(locale, 'projects'),
      label: t.nav.projects,
      menu: await workMenu(t, projects, (id) => homeSectionPath(locale, id)),
    },
    { href: homeSectionPath(locale, 'capabilities'), label: t.nav.skills },
    { href: homeSectionPath(locale, 'services'), label: t.nav.services },
    { href: homeSectionPath(locale, 'contact'), label: t.nav.contact },
  ];
};
