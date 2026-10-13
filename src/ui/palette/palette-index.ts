import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import type { Note } from '../../domain/writing/note';
import type { Dictionary } from '../i18n/dictionary';
import {
  homePath,
  homeSectionPath,
  notePath,
  notesPath,
  nowPath,
  privacyPath,
  projectPath,
} from '../i18n/routes';
import { SITE } from '../site';

/*
 * The command palette's index (ADR 0016): every page, project and note of one language, plus a few
 * actions. It is built at build time into /palette/<locale>.json and fetched the first time the
 * palette opens, so pages do not carry it in their HTML.
 */

export type PaletteGroup = 'pages' | 'projects' | 'notes' | 'actions';

/** Actions run in the browser; everything else is a link. */
export type PaletteAction = 'toggle-theme' | 'switch-language' | 'copy-email';

export interface PaletteItem {
  readonly id: string;
  readonly group: PaletteGroup;
  readonly label: string;
  /** Short secondary text: the kind of project, a note's date, an address. */
  readonly hint: string | null;
  /** Extra words that should find the item (stack, topics). */
  readonly keywords: readonly string[];
  readonly href: string | null;
  readonly action: PaletteAction | null;
}

export interface PaletteSources {
  readonly t: Dictionary;
  readonly locale: Locale;
  readonly projects: readonly Project[];
  readonly notes: readonly Note[];
}

const link = (
  id: string,
  group: PaletteGroup,
  label: string,
  href: string,
  hint: string | null = null,
  keywords: readonly string[] = [],
): PaletteItem => ({ id, group, label, hint, keywords, href, action: null });

const action = (id: PaletteAction, label: string, hint: string | null = null): PaletteItem => ({
  id,
  group: 'actions',
  label,
  hint,
  keywords: [],
  href: null,
  action: id,
});

export const buildPaletteIndex = ({
  t,
  locale,
  projects,
  notes,
}: PaletteSources): readonly PaletteItem[] => [
  link('home', 'pages', t.nav.home, homePath(locale)),
  link('projects', 'pages', t.nav.projects, homeSectionPath(locale, 'projects')),
  link('capabilities', 'pages', t.nav.skills, homeSectionPath(locale, 'capabilities')),
  link('services', 'pages', t.nav.services, homeSectionPath(locale, 'services')),
  link('contact', 'pages', t.nav.contact, homeSectionPath(locale, 'contact')),
  link('notes', 'pages', t.nav.notes, notesPath(locale)),
  link('now', 'pages', t.nav.now, nowPath(locale)),
  link('privacy', 'pages', t.footer.privacy, privacyPath(locale)),
  ...projects.map((project) =>
    link(
      `project:${project.slug}`,
      'projects',
      project.title,
      projectPath(locale, project.slug),
      t.kindLabels[project.kind],
      [...project.stack, ...project.capabilities.map((c) => t.capabilityLabels[c])],
    ),
  ),
  ...notes.map((note) =>
    link(`note:${note.slug}`, 'notes', note.title, notePath(locale, note.slug), null, note.tags),
  ),
  action('toggle-theme', t.palette.toggleTheme),
  action('switch-language', t.palette.switchLanguage),
  action('copy-email', t.palette.copyEmail, SITE.email),
  link('github', 'actions', 'GitHub', SITE.githubUrl, 'github.com/juanpacj-wq'),
  link('linkedin', 'actions', 'LinkedIn', SITE.linkedinUrl, 'linkedin.com/in/juan-cespedesjc'),
];
