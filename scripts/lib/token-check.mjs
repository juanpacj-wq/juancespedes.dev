// Finds raw design values outside the token file: hex/rgb/hsl/oklch colors, and Tailwind
// arbitrary values on design utilities (spacing, type, color, radius, shadow), e.g. `p-[13px]`
// or `text-[1.1rem]`. Layout values such as `grid-cols-[1fr_22rem]`, property lists such as
// `transition-[color,transform]` and variants such as `supports-[...]:` are allowed.
// A line can opt out with a `tokens-allow` comment that explains why.

const COLOR =
  /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i;

const DESIGN_UTILITIES = (
  'p px py pt pr pb pl ps pe m mx my mt mr mb ml ms me gap gap-x gap-y space-x space-y ' +
  'text leading tracking font rounded rounded-t rounded-r rounded-b rounded-l shadow bg border ' +
  'ring outline fill stroke from via to decoration accent caret'
).split(' ');

// A design utility (optionally negative) used as a class token, followed by `-[` and a literal
// that starts with `#` or a digit.
const ARBITRARY_VALUE = new RegExp(
  `(?<=^|[\\s"'{:])-?(?:${DESIGN_UTILITIES.join('|')})-\\[(?:#|-?\\d)[^\\]]*\\]`,
  'i',
);

/**
 * @param {string} text
 * @returns {{ line: number, match: string }[]}
 */
export const findRawValues = (text) =>
  text.split('\n').flatMap((content, index, lines) => {
    const allowed = /tokens-allow/.test(content) || /tokens-allow/.test(lines[index - 1] ?? '');
    if (allowed) return [];
    const hit = COLOR.exec(content) ?? ARBITRARY_VALUE.exec(content);
    return hit ? [{ line: index + 1, match: hit[0] }] : [];
  });
