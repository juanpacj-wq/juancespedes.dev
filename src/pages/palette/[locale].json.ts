import type { APIRoute, GetStaticPaths } from 'astro';

import { container } from '../../composition/container';
import { parseLocale, SUPPORTED_LOCALES } from '../../domain/shared/locale';
import { dictionaryFor } from '../../ui/i18n/dictionary';
import { buildPaletteIndex } from '../../ui/palette/palette-index';

/** The command palette index of each language, generated at build time (ADR 0016). */
export const getStaticPaths = (() =>
  SUPPORTED_LOCALES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const locale = parseLocale(params.locale ?? '');
  if (!locale.ok) return new Response(null, { status: 404 });
  const [projects, notes] = await Promise.all([
    container.listProjects(locale.value),
    container.listNotes(locale.value),
  ]);
  const index = buildPaletteIndex({
    t: dictionaryFor(locale.value),
    locale: locale.value,
    projects,
    notes,
  });
  return Response.json(index);
};
