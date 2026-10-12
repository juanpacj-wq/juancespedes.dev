import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import { SUPPORTED_LOCALES } from '../../src/domain/shared/locale';
import { normalizeTechnologyName } from '../../src/domain/project/technology';
import {
  headlineMetricSchema,
  projectFrontmatterSchema,
  technologySchema,
  type ProjectFrontmatter,
} from '../../src/infrastructure/content/schemas';

/*
 * Checks every real content file, including the ones added in the future. The build already
 * validates each file on its own; these tests cover rules that span files (translation parity,
 * catalog references) and the anonymization policy.
 */

const CONTENT = join(process.cwd(), 'content');
const PROJECTS = join(CONTENT, 'projects');

const readYaml = (path: string): unknown => parseYaml(readFileSync(path, 'utf8'));

const frontmatterOf = (path: string): unknown => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, 'utf8'));
  if (!match?.[1]) throw new Error(`${path} has no frontmatter`);
  return parseYaml(match[1]);
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const projectSlugs = readdirSync(PROJECTS).filter((name) =>
  statSync(join(PROJECTS, name)).isDirectory(),
);

const parsedProject = (slug: string, locale: string): ProjectFrontmatter =>
  projectFrontmatterSchema.parse(frontmatterOf(join(PROJECTS, slug, `${locale}.mdx`)));

describe('projects', () => {
  it('there is at least one project', () => {
    expect(projectSlugs.length).toBeGreaterThan(0);
  });

  describe.each(projectSlugs)('%s', (slug) => {
    it('exists in every supported locale and nothing else sits next to it', () => {
      const files = readdirSync(join(PROJECTS, slug)).filter((name) => name.endsWith('.mdx'));
      expect(files.sort()).toEqual(SUPPORTED_LOCALES.map((locale) => `${locale}.mdx`).sort());
    });

    it.each(SUPPORTED_LOCALES)('the %s file passes the schema and the domain rules', (locale) => {
      const result = projectFrontmatterSchema.safeParse(
        frontmatterOf(join(PROJECTS, slug, `${locale}.mdx`)),
      );
      expect(result.error?.issues ?? []).toEqual([]);
    });

    it('is not published while it still has TODO placeholders', () => {
      for (const locale of SUPPORTED_LOCALES) {
        const path = join(PROJECTS, slug, `${locale}.mdx`);
        if (parsedProject(slug, locale).status === 'published') {
          expect(readFileSync(path, 'utf8')).not.toMatch(/\bTODO\b/);
        }
      }
    });

    it('keeps language-independent fields identical across locales', () => {
      const invariant = (p: ProjectFrontmatter) => ({
        kind: p.kind,
        period: p.period,
        capabilities: p.capabilities,
        stack: p.stack,
        featured: p.featured,
        order: p.order,
        status: p.status,
        confidentiality: p.confidentiality,
        links: p.links.map((link) => link.url),
        metricCount: p.metrics.length,
        repository: p.kind === 'open-source' ? p.repository : null,
      });
      const [reference, ...others] = SUPPORTED_LOCALES.map((locale) =>
        invariant(parsedProject(slug, locale)),
      );
      for (const other of others) expect(other).toEqual(reference);
    });
  });
});

describe('technology catalog', () => {
  const catalog = technologySchema.array().parse(readYaml(join(CONTENT, 'technologies.yaml')));

  it('has unique ids and names', () => {
    const ids = catalog.map((t) => t.id);
    const names = catalog.map((t) => normalizeTechnologyName(t.name));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('knows every technology a project lists', () => {
    const known = new Set(catalog.map((t) => normalizeTechnologyName(t.name)));
    const unknown = projectSlugs.flatMap((slug) =>
      SUPPORTED_LOCALES.flatMap((locale) =>
        parsedProject(slug, locale)
          .stack.filter((name) => !known.has(normalizeTechnologyName(name)))
          .map((name) => `${slug}/${locale}: ${name}`),
      ),
    );
    expect(unknown).toEqual([]);
  });
});

describe('headline metrics', () => {
  const metrics = headlineMetricSchema
    .array()
    .parse(readYaml(join(CONTENT, 'headline-metrics.yaml')));

  it('has unique ids and orders', () => {
    expect(new Set(metrics.map((m) => m.id)).size).toBe(metrics.length);
    expect(new Set(metrics.map((m) => m.order)).size).toBe(metrics.length);
  });
});

describe('anonymization and style policy', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  const forbidden: readonly (readonly [string, RegExp])[] = [
    ['IPv4 address', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
    ['internal hostname', /\b[\w-]+\.(?:local|lan|corp|internal|intranet)\b/i],
    ['localhost URL', /localhost:\d+/i],
    ['Windows network path', /\\\\[\w.-]+\\/],
    ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['em dash', new RegExp(EM_DASH)],
  ];
  const files = walk(CONTENT).filter((path) => /\.(mdx?|ya?ml)$/.test(path));

  it.each(files.map((path) => [relative(process.cwd(), path), path]))(
    '%s contains no internal data or forbidden characters',
    (_, path) => {
      const text = readFileSync(path, 'utf8');
      const hits = forbidden.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
      expect(hits).toEqual([]);
    },
  );
});
