import { describe, expect, it } from 'vitest';

import { dictionaryFor } from '../../../src/ui/i18n/dictionary';
import { buildPaletteIndex, type PaletteItem } from '../../../src/ui/palette/palette-index';
import { normalize, scoreItem, searchPalette } from '../../../src/ui/palette/search';
import { caseStudyContent, project } from '../../support/project-builders';

const item = (label: string, keywords: string[] = [], hint: string | null = null): PaletteItem => ({
  id: label,
  group: 'projects',
  label,
  hint,
  keywords,
  href: '/x',
  action: null,
});

describe('palette search', () => {
  it('ignores accents and case', () => {
    expect(normalize('  Telemetría ÉLÉCTRICA ')).toBe('telemetria electrica');
    expect(searchPalette([item('Telemetría de generación')], 'TELEMETRIA')).toHaveLength(1);
  });

  it('ranks a label prefix above a word start, a substring and a keyword', () => {
    const items = [
      item('Notes about servers', ['sql']),
      item('My SQL notes'),
      item('Mysql tuning'),
      item('SQL Server telemetry'),
    ];
    expect(searchPalette(items, 'sql').map((i) => i.label)).toEqual([
      'SQL Server telemetry',
      'My SQL notes',
      'Mysql tuning',
      'Notes about servers',
    ]);
  });

  it('requires every word of the query to match somewhere', () => {
    const logbook = item('Operations logbook', ['React', 'SQL Server'], 'Case study');
    expect(scoreItem(logbook, 'logbook react')).toBeGreaterThan(0);
    expect(scoreItem(logbook, 'case')).toBeGreaterThan(0);
    expect(scoreItem(logbook, 'logbook python')).toBe(0);
  });

  it('returns everything for an empty query, in index order, up to the limit', () => {
    const items = ['a', 'b', 'c'].map((label) => item(label));
    expect(searchPalette(items, '   ').map((i) => i.label)).toEqual(['a', 'b', 'c']);
    expect(searchPalette(items, '', 2)).toHaveLength(2);
  });
});

describe('palette index', () => {
  const t = dictionaryFor('en');
  const telemetry = project(
    'plant-telemetry',
    caseStudyContent({ title: 'Telemetry', stack: ['Modbus TCP'], capabilities: ['data-bi'] }),
  );
  const index = buildPaletteIndex({ t, locale: 'en', projects: [telemetry], notes: [] });

  it('lists pages, projects with their stack as keywords, and actions', () => {
    expect(index.find((i) => i.id === 'notes')).toMatchObject({ href: '/en/notes' });
    expect(index.find((i) => i.id === 'project:plant-telemetry')).toMatchObject({
      group: 'projects',
      href: '/en/projects/plant-telemetry',
      hint: 'Case study',
      keywords: ['Modbus TCP', 'Data and BI'],
    });
    expect(index.filter((i) => i.group === 'actions').map((i) => i.id)).toEqual([
      'toggle-theme',
      'switch-language',
      'copy-email',
      'github',
      'linkedin',
    ]);
  });

  it('finds a project by a technology it uses', () => {
    expect(searchPalette(index, 'modbus').map((i) => i.id)).toEqual(['project:plant-telemetry']);
  });

  it('has unique ids, and every item is either a link or an action', () => {
    expect(new Set(index.map((i) => i.id)).size).toBe(index.length);
    for (const entry of index) expect(Boolean(entry.href) !== Boolean(entry.action)).toBe(true);
  });
});
