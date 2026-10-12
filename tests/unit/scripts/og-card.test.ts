import { describe, expect, it } from 'vitest';

import { cardSvg, escapeXml, fitText, textWidth, wrapText } from '../../../scripts/lib/og-card.mjs';

describe('Open Graph card layout', () => {
  it('wraps on word boundaries within the width', () => {
    const text = 'Telemetría de generación eléctrica en tiempo real';
    const lines = wrapText(text, { fontSize: 76, maxWidth: 1056, maxLines: 3 });
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 76)).toBeLessThanOrEqual(1056);
    expect(lines.join(' ')).toBe(text);
  });

  it('ends with an ellipsis when the text does not fit in the allowed lines', () => {
    const lines = wrapText('uno dos tres cuatro cinco seis siete ocho nueve diez', {
      fontSize: 40,
      maxWidth: 200,
      maxLines: 2,
    });
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
  });

  it('shrinks the title before cutting it', () => {
    const long =
      'Bilingual corporate portal with measured security and accessibility for a power utility';
    const fitted = fitText(long, { sizes: [76, 60, 48], maxWidth: 1056, maxLines: 3 });
    expect(fitted.lines.join(' ')).toBe(long);
    expect(fitted.fontSize).toBeLessThan(76);
  });

  it('draws escaped text into a 1200 x 630 SVG', () => {
    const svg = cardSvg({
      eyebrow: 'Case study',
      title: 'R&D <tools>',
      highlight: { value: '74', label: 'findings' },
      footer: 'Juan',
    });
    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(svg).toContain('R&amp;D &lt;tools&gt;');
    expect(svg).toContain('CASE STUDY');
    expect(escapeXml('"it\'s"')).toBe('&quot;it&apos;s&quot;');
  });
});
