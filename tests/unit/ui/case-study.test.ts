import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { formatFigure, parseFigure } from '../../../src/ui/project/figure';
import {
  logoFor,
  luminance,
  monogramFor,
  rasterLogoFor,
  techId,
  techLogoSprite,
} from '../../../src/ui/icons/tech-logos';
import { portOffset, wireEnds, wirePath, type Box } from '../../../src/ui/project/wires';

describe('parseFigure', () => {
  it('counts the number and keeps the words around it', () => {
    expect(parseFigure('516', 'es')).toEqual({
      prefix: '',
      target: 516,
      decimals: 0,
      grouped: false,
      suffix: '',
    });
    expect(parseFigure('38 de 39', 'es')).toMatchObject({ target: 38, suffix: ' de 39' });
    expect(parseFigure('300 MB a 5 MB', 'es')).toMatchObject({ target: 300, suffix: ' MB a 5 MB' });
  });

  it('reads thousands and decimals in each language', () => {
    expect(parseFigure('1.400+', 'es')).toMatchObject({ target: 1400, grouped: true, suffix: '+' });
    expect(parseFigure('1,400+', 'en')).toMatchObject({ target: 1400, grouped: true, suffix: '+' });
    expect(parseFigure('1,33 GB', 'es')).toMatchObject({ target: 1.33, decimals: 2 });
    expect(parseFigure('1.33 GB', 'en')).toMatchObject({ target: 1.33, decimals: 2 });
  });

  it('skips a leading zero and counts the next number', () => {
    expect(parseFigure('0 a 151', 'es')).toMatchObject({ prefix: '0 a ', target: 151, suffix: '' });
  });

  it('returns null when there is nothing to count', () => {
    expect(parseFigure('Cero', 'es')).toBeNull();
    expect(parseFigure('0', 'en')).toBeNull();
    // "1.4" is not a Spanish number: the dot only groups thousands.
    expect(parseFigure('1.4', 'es')).toBeNull();
  });
});

describe('formatFigure', () => {
  it('ends on the written text', () => {
    for (const [value, locale] of [
      ['1.400+', 'es'],
      ['1,400+', 'en'],
      ['38 de 39', 'es'],
      ['0 a 151', 'es'],
      ['1,33 GB', 'es'],
      ['12,500 rows', 'en'],
    ] as const) {
      const figure = parseFigure(value, locale);
      expect(figure && formatFigure(figure, figure.target, locale)).toBe(value);
    }
  });

  it('groups and rounds the frames like the written number', () => {
    const figure = parseFigure('1.400+', 'es');
    expect(figure && formatFigure(figure, 999.6, 'es')).toBe('1.000+');
    expect(figure && formatFigure(figure, 0, 'es')).toBe('0+');
  });
});

describe('wires', () => {
  const box = (x: number, y = 0): Box => ({ x, y, width: 100, height: 40 });

  it('leaves and enters by the sides that face each other', () => {
    expect(wireEnds(box(0), box(200))).toEqual({ from: 'right', to: 'left' });
    expect(wireEnds(box(200), box(0))).toEqual({ from: 'left', to: 'right' });
  });

  it('loops out of the right side when both nodes share a column', () => {
    expect(wireEnds(box(0), box(0, 100))).toEqual({ from: 'right', to: 'right' });
    expect(wirePath(box(0), box(0, 100))).toBe('M100 20C136 20 136 120 100 120');
  });

  it('draws a horizontal S-curve between columns', () => {
    expect(wirePath(box(0), box(300, 60))).toBe('M100 20C200 20 200 80 300 80');
  });

  it('spreads wires that share a side around its middle', () => {
    expect(portOffset(0, 1, 40)).toBe(0);
    expect([0, 1, 2].map((index) => portOffset(index, 3, 40))).toEqual([-12, 0, 12]);
    expect(portOffset(0, 2, 10)).toBe(-3);
  });
});

describe('tech logos', () => {
  it('computes WCAG luminance', () => {
    expect(luminance('000000')).toBe(0);
    expect(luminance('FFFFFF')).toBeCloseTo(1);
  });

  it('keeps the brand colour only where it holds 3:1 against the canvas', () => {
    // React's cyan is bright: fine on the dark canvas.
    expect(logoFor('React')).toMatchObject({ onDark: true });
    // Express is near black: drawn in the ink colour instead.
    expect(logoFor('Express')).toMatchObject({ onDark: false });
  });

  it('has no logo for technologies without a free, faithful mark', () => {
    expect(logoFor('SQL Server')).toBeNull();
    expect(logoFor('Legacy code rescue')).toBeNull();
  });

  it('names each technology the same way in the sprite and the page', () => {
    expect(techId('Node.js')).toBe('node-js');
    expect(techId('WCAG 2.2')).toBe('wcag-2-2');
    expect(techId('pdfminer.six')).toBe('pdfminer-six');
    const sprite = techLogoSprite();
    expect(sprite).toContain('<symbol id="node-js" viewBox="0 0 24 24">');
    expect(sprite).not.toContain('id="sql-server"');
  });

  it('gives a technology without a logo a short monogram', () => {
    expect(monogramFor('SQL Server')).toBe('SQL');
    expect(monogramFor('Some Tool')).toBe('SO');
  });

  it('points a brand Simple Icons lacks at its raster file in public/tech', () => {
    const names = [
      'Excel',
      'Microsoft Entra ID',
      'Microsoft Fabric',
      'Microsoft Graph',
      'Oracle',
      'Playwright',
      'Power BI',
      'SQL Server',
      'systemd',
      'WCAG 2.2',
      'WebSockets',
    ];
    for (const name of names) {
      const address = rasterLogoFor(name);
      expect(address).toBe(`/tech/${techId(name)}.webp`);
      expect(existsSync(`public${String(address)}`)).toBe(true);
    }
    expect(rasterLogoFor('Some Tool')).toBeNull();
  });
});
