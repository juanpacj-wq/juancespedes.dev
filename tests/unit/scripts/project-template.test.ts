import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import { projectFrontmatterSchema } from '../../../src/infrastructure/content/schemas';
import { isValidSlug, KINDS, renderProjectFile } from '../../../scripts/lib/project-template.mjs';

const frontmatter = (file: string): unknown => parseYaml(file.split('---')[1] ?? '');

describe('new:project templates', () => {
  it.each(
    KINDS.flatMap((kind) => (['es', 'en'] as const).map((locale) => [kind, locale] as const)),
  )('a new %s draft in %s is valid content from the first save', (kind, locale) => {
    const file = renderProjectFile({
      kind,
      title: "Sales: Q3 'pilot'",
      locale,
      start: '2026-10',
    });
    const result = projectFrontmatterSchema.safeParse(frontmatter(file));

    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data).toMatchObject({ kind, status: 'draft', title: "Sales: Q3 'pilot'" });
  });

  it('marks every placeholder so it cannot be published by accident', () => {
    expect(
      renderProjectFile({ kind: 'report', title: 'X', locale: 'en', start: '2026-10' }),
    ).toMatch(/TODO/);
  });

  it('validates slugs the same way the domain does', () => {
    expect(isValidSlug('sales-dashboard')).toBe(true);
    expect(isValidSlug('Sales Dashboard')).toBe(false);
  });
});
