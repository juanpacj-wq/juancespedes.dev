// Open Graph cards (1200 x 630) drawn as SVG. Pure functions so tests can check them; the
// renderer in scripts/generate-og.mjs turns the SVG into PNG with resvg and the Geist fonts.
// There is no text measurement in SVG, so lines are wrapped with approximate glyph widths for
// Geist; the estimate errs wide, so real lines come out a little shorter than the limit.

export const WIDTH = 1200;
export const HEIGHT = 630;

// Dark theme tokens (src/ui/styles/global.css). Cards always use the dark theme.
const COLORS = {
  canvas: '#0b0b0d',
  surface: '#141417',
  line: '#27272c',
  ink: '#ededef',
  muted: '#a1a1aa',
  subtle: '#8b8b94',
  accent: '#f5a524',
};

const NARROW = new Set([..."iljtfrI.,:;!|'()[]"]);
const WIDE = new Set([...'mwMW']);

/** Approximate advance of one character in em for Geist Sans. @param {string} char */
const charWidth = (char) => {
  if (char === ' ') return 0.28;
  if (NARROW.has(char)) return 0.32;
  if (WIDE.has(char)) return 0.86;
  if (/[A-ZÁÉÍÓÚÑ0-9]/.test(char)) return 0.66;
  return 0.56;
};

/**
 * Estimated width in px of `text` at `fontSize`.
 * @param {string} text
 * @param {number} fontSize
 */
export const textWidth = (text, fontSize) =>
  [...text].reduce((total, char) => total + charWidth(char), 0) * fontSize;

/**
 * Greedy word wrap. Returns at most `maxLines` lines; if the text does not fit, the last line ends
 * with an ellipsis. A single word longer than the line is kept whole rather than split.
 * @param {string} text
 * @param {{ fontSize: number, maxWidth: number, maxLines: number }} options
 * @returns {string[]}
 */
export const wrapText = (text, { fontSize, maxWidth, maxLines }) => {
  const words = text.trim().split(/\s+/);
  /** @type {string[]} */
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? '';
  while (last.includes(' ') && textWidth(`${last}…`, fontSize) > maxWidth) {
    last = last.slice(0, last.lastIndexOf(' '));
  }
  kept[maxLines - 1] = `${last.replace(/[\s,.;:]+$/, '')}…`;
  return kept;
};

/**
 * Picks the largest size from `sizes` at which `text` fits in `maxLines` without ellipsis.
 * @param {string} text
 * @param {{ sizes: number[], maxWidth: number, maxLines: number }} options
 */
export const fitText = (text, { sizes, maxWidth, maxLines }) => {
  for (const fontSize of sizes) {
    const lines = wrapText(text, { fontSize, maxWidth, maxLines: Number.POSITIVE_INFINITY });
    if (lines.length <= maxLines) return { fontSize, lines };
  }
  const fontSize = sizes[sizes.length - 1] ?? 48;
  return { fontSize, lines: wrapText(text, { fontSize, maxWidth, maxLines }) };
};

/** @param {string} value */
export const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const PAD = 72;
const CONTENT_WIDTH = WIDTH - PAD * 2;

/**
 * @param {{
 *   eyebrow: string,
 *   title: string,
 *   subtitle?: string | null,
 *   body?: string | null,
 *   titleSizes?: number[],
 *   highlight?: { value: string, label: string } | null,
 *   footer: string,
 * }} card
 * @returns {string} SVG markup
 */
export const cardSvg = ({
  eyebrow,
  title,
  subtitle = null,
  body = null,
  titleSizes = [76, 68, 60, 54],
  highlight = null,
  footer,
}) => {
  const heading = fitText(title, { sizes: titleSizes, maxWidth: CONTENT_WIDTH, maxLines: 3 });
  const lineHeight = Math.round(heading.fontSize * 1.08);
  // Baseline of the first line: leaves the same gap under the header row at any title size.
  const titleTop = Math.round(166 + heading.fontSize * 0.72);
  const titleLines = heading.lines
    .map(
      (line, index) =>
        `<text x="${PAD}" y="${titleTop + index * lineHeight}" font-family="Geist" font-weight="600" font-size="${heading.fontSize}" letter-spacing="-1.5" fill="${COLORS.ink}">${escapeXml(line)}</text>`,
    )
    .join('');
  const afterTitle = titleTop + (heading.lines.length - 1) * lineHeight;

  const subtitleSvg = subtitle
    ? wrapText(subtitle, { fontSize: 30, maxWidth: CONTENT_WIDTH, maxLines: 2 })
        .map(
          (line, index) =>
            `<text x="${PAD}" y="${afterTitle + 64 + index * 40}" font-family="Geist" font-size="30" fill="${COLORS.muted}">${escapeXml(line)}</text>`,
        )
        .join('')
    : '';

  const bodyTop = afterTitle + (subtitle ? 140 : 72);
  const bodySvg = body
    ? wrapText(body, { fontSize: 28, maxWidth: CONTENT_WIDTH - 80, maxLines: 3 })
        .map(
          (line, index) =>
            `<text x="${PAD}" y="${bodyTop + index * 40}" font-family="Geist" font-size="28" fill="${COLORS.subtle}">${escapeXml(line)}</text>`,
        )
        .join('')
    : '';

  const highlightSvg = highlight
    ? `<text x="${PAD}" y="528" font-family="Geist Mono" font-weight="500" font-size="44" fill="${COLORS.accent}">${escapeXml(highlight.value)}</text>` +
      `<text x="${PAD + textWidth(highlight.value, 44) * 0.98 + 24}" y="526" font-family="Geist" font-size="24" fill="${COLORS.muted}">${escapeXml(
        wrapText(highlight.label, {
          fontSize: 24,
          maxWidth: CONTENT_WIDTH - textWidth(highlight.value, 44) - 24,
          maxLines: 1,
        })[0] ?? '',
      )}</text>`
    : '';

  const badgeWidth = textWidth(eyebrow.toUpperCase(), 20) * 1.12 + 40;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.canvas}"/>`,
    `<rect x="24" y="24" width="${WIDTH - 48}" height="${HEIGHT - 48}" rx="28" fill="${COLORS.surface}" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<text x="${PAD}" y="112" font-family="Geist Mono" font-weight="500" font-size="28" fill="${COLORS.ink}">juancespedes<tspan fill="${COLORS.accent}">.dev</tspan></text>`,
    `<rect x="${WIDTH - PAD - badgeWidth}" y="80" width="${badgeWidth}" height="44" rx="22" fill="none" stroke="${COLORS.accent}" stroke-opacity="0.5" stroke-width="2"/>`,
    `<text x="${WIDTH - PAD - badgeWidth / 2}" y="109" text-anchor="middle" font-family="Geist Mono" font-size="20" letter-spacing="1.5" fill="${COLORS.accent}">${escapeXml(eyebrow.toUpperCase())}</text>`,
    titleLines,
    subtitleSvg,
    bodySvg,
    highlightSvg,
    `<line x1="${PAD}" y1="562" x2="${WIDTH - PAD}" y2="562" stroke="${COLORS.line}" stroke-width="2"/>`,
    `<text x="${PAD}" y="${HEIGHT - 40}" font-family="Geist" font-size="22" fill="${COLORS.subtle}">${escapeXml(footer)}</text>`,
    '</svg>',
  ].join('');
};
