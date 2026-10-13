#!/usr/bin/env node
// Generates one Open Graph card per page and language into public/og/ (git-ignored), before the
// Astro build. Paths match ogImagePath() in src/ui/i18n/routes.ts. Text comes from the same
// sources as the pages: the interface dictionary and each project's frontmatter.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { parse as parseYaml } from 'yaml';

import { dictionaryFor } from '../src/ui/i18n/dictionary.ts';
import { cardSvg } from './lib/og-card.mjs';

const ROOT = process.cwd();
const OUT = join(ROOT, 'public', 'og');
const PROJECTS = join(ROOT, 'content', 'projects');
const NOTES = join(ROOT, 'content', 'notes');
const LOCALES = /** @type {const} */ (['es', 'en']);

const FONT_DIR = join(ROOT, 'node_modules', 'geist', 'dist', 'fonts');
const fontFiles = [
  join(FONT_DIR, 'geist-sans', 'Geist-Regular.ttf'),
  join(FONT_DIR, 'geist-sans', 'Geist-SemiBold.ttf'),
  join(FONT_DIR, 'geist-mono', 'GeistMono-Regular.ttf'),
  join(FONT_DIR, 'geist-mono', 'GeistMono-Medium.ttf'),
];

/** @param {string} path */
const frontmatter = (path) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, 'utf8'));
  if (!match?.[1]) throw new Error(`${path} has no frontmatter`);
  return parseYaml(match[1]);
};

/** @param {string} relativePath @param {Parameters<typeof cardSvg>[0]} card */
const write = (relativePath, card) => {
  const png = new Resvg(cardSvg(card), {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Geist' },
  })
    .render()
    .asPng();
  const path = join(OUT, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
};

/** @param {string} dir */
const folders = (dir) => readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
const slugs = folders(PROJECTS);
const noteSlugs = folders(NOTES);
let count = 0;

for (const locale of LOCALES) {
  const t = dictionaryFor(locale);
  const byline = `${t.profile.name} · ${t.profile.role}`;

  write(`${locale}/home.png`, {
    eyebrow: t.availability.available,
    title: t.profile.name,
    titleSizes: [104],
    subtitle: t.profile.role,
    body: t.hero.pitch,
    footer: t.profile.location,
  });
  write(`${locale}/privacy.png`, {
    eyebrow: t.footer.privacy,
    title: t.footer.privacy,
    subtitle: t.meta.siteName,
    footer: byline,
  });
  write(`${locale}/now.png`, {
    eyebrow: t.now.eyebrow,
    title: t.now.title,
    subtitle: t.now.description,
    footer: byline,
  });
  write(`${locale}/notes.png`, {
    eyebrow: t.notes.eyebrow,
    title: t.notes.title,
    subtitle: t.notes.description,
    footer: byline,
  });
  count += 4;

  for (const slug of noteSlugs) {
    const note = frontmatter(join(NOTES, slug, `${locale}.mdx`));
    if (note.status !== 'published') continue;
    write(`${locale}/notes/${slug}.png`, {
      eyebrow: t.notes.eyebrow,
      title: note.title,
      subtitle: note.summary,
      footer: byline,
    });
    count += 1;
  }

  for (const slug of slugs) {
    const project = frontmatter(join(PROJECTS, slug, `${locale}.mdx`));
    if (project.status !== 'published') continue;
    const metric = project.metrics?.[0];
    write(`${locale}/projects/${slug}.png`, {
      eyebrow: t.kindLabels[/** @type {keyof typeof t.kindLabels} */ (project.kind)],
      title: project.title,
      highlight: metric ? { value: metric.value, label: metric.label } : null,
      footer: byline,
    });
    count += 1;
  }
}

console.log(`og: ${String(count)} cards written to public/og/`);
