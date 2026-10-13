import type { APIRoute, GetStaticPaths } from 'astro';

import { container } from '../../composition/container';
import { parseLocale, SUPPORTED_LOCALES } from '../../domain/shared/locale';
import { buildCorpus } from '../../ui/chat/build-corpus';
import { dictionaryFor } from '../../ui/i18n/dictionary';
import { SITE } from '../../ui/site';

/**
 * What the "Ask me" assistant knows, per language, generated at build time (ADR 0017). The Worker
 * reads it from its static assets; the evaluation script reads the same file from dist/.
 */
export const getStaticPaths = (() =>
  SUPPORTED_LOCALES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const locale = parseLocale(params.locale ?? '');
  if (!locale.ok) return new Response(null, { status: 404 });
  const [profile, projects, notes, now] = await Promise.all([
    container.getProfile(locale.value),
    container.listProjects(locale.value),
    container.listNotes(locale.value),
    container.getNowPage(locale.value),
  ]);
  const corpus = buildCorpus({
    t: dictionaryFor(locale.value),
    locale: locale.value,
    email: SITE.email,
    profile,
    projects,
    notes,
    now,
  });
  return new Response(corpus, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
