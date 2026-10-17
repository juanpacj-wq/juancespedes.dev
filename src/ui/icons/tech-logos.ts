import {
  siApacheairflow,
  siAstro,
  siCloudflareworkers,
  siDirectus,
  siDocker,
  siExpress,
  siFigma,
  siGithubactions,
  siGnubash,
  siJavascript,
  siLinux,
  siMariadb,
  siModelcontextprotocol,
  siMongodb,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPandas,
  siPhp,
  siPostgresql,
  siPytest,
  siPython,
  siReact,
  siSelenium,
  siSqlite,
  siTailwindcss,
  siTypescript,
  siVite,
  siWordpress,
  type SimpleIcon,
} from 'simple-icons';

/*
 * Technology logos, for the band of a case study (ADR 0023) and the stack on the home page.
 * Paths come from Simple Icons (CC0). The band inlines them at build time; the home page reads
 * them from one sprite (src/pages/tech-logos.svg.ts) once the section comes near, so the logos
 * do not weigh on its HTML. Brands Simple Icons lacks (Microsoft products, systemd, Oracle) use
 * the raster files below on the home page; anything else (protocols, practices) is shown by its
 * name or a monogram, so no page shows a wrong or invented mark.
 */

const LOGOS: Readonly<Record<string, SimpleIcon>> = {
  'Apache Airflow': siApacheairflow,
  Astro: siAstro,
  Bash: siGnubash,
  'Cloudflare Workers': siCloudflareworkers,
  Directus: siDirectus,
  Docker: siDocker,
  Express: siExpress,
  Figma: siFigma,
  'GitHub Actions': siGithubactions,
  JavaScript: siJavascript,
  Linux: siLinux,
  MariaDB: siMariadb,
  'Model Context Protocol': siModelcontextprotocol,
  MongoDB: siMongodb,
  'Next.js': siNextdotjs,
  nginx: siNginx,
  'Node.js': siNodedotjs,
  pandas: siPandas,
  PHP: siPhp,
  PostgreSQL: siPostgresql,
  pytest: siPytest,
  Python: siPython,
  React: siReact,
  Selenium: siSelenium,
  SQLite: siSqlite,
  'Tailwind CSS': siTailwindcss,
  TypeScript: siTypescript,
  Vite: siVite,
  WordPress: siWordpress,
};

export interface TechLogo {
  readonly path: string;
  /** Brand colour as six hex digits, without the hash. */
  readonly hex: string;
  /** Whether the brand colour keeps 3:1 against the canvas. */
  readonly onDark: boolean;
}

/** WCAG relative luminance of a six-digit hex colour. Exported for tests. */
export const luminance = (hex: string): number => {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
};

/*
 * The canvas is near the dark end of the scale (luminance about 0.004), so 3:1 for a graphic
 * means a luminance of at least 0.1. A darker brand colour is drawn in the ink colour.
 */
const DARK_MIN = 0.1;

export const logoFor = (name: string): TechLogo | null => {
  const icon = LOGOS[name];
  if (!icon) return null;
  const value = luminance(icon.hex);
  return { path: icon.path, hex: icon.hex, onDark: value >= DARK_MIN };
};

/** A technology's id in a sprite or a page: "Node.js" is "node-js", "WCAG 2.2" is "wcag-2-2". */
export const techId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/*
 * What stands in the logo's place when a technology has none: a short mark of the name, set in
 * the mono face like an element in a table. Decorative; the full name always sits next to it.
 */
const MONOGRAMS: Readonly<Record<string, string>> = {
  Azure: 'AZ',
  CustomTkinter: 'TK',
  Excel: 'XLS',
  'Incident forensics': 'RCA',
  'Legacy code rescue': '</>',
  'LLM integration': 'LLM',
  'Microsoft Entra ID': 'ID',
  'Microsoft Fabric': 'FAB',
  'Microsoft Graph': 'GR',
  'Modbus TCP': 'MB',
  Oracle: 'ORA',
  'pdfminer.six': 'PDF',
  Playwright: 'PW',
  'Power BI': 'BI',
  PyInstaller: 'EXE',
  'REST APIs': '{ }',
  'SQL Server': 'SQL',
  systemd: 'SD',
  'WCAG 2.2': 'A11Y',
  WebSockets: 'WS',
};

/*
 * Logos that Simple Icons does not carry, as the brands publish them: small raster files in
 * public/tech/<techId>.webp (96 px, twice the tile), named here so a missing one fails a test
 * instead of a page.
 */
const RASTER_LOGOS: ReadonlySet<string> = new Set([
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
]);

/** Address of a technology's raster logo, or null when it has none. */
export const rasterLogoFor = (name: string): string | null =>
  RASTER_LOGOS.has(name) ? `/tech/${techId(name)}.webp` : null;

export const monogramFor = (name: string): string =>
  MONOGRAMS[name] ??
  name
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

/** Every logo as one SVG sprite of symbols, addressed as `tech-logos.svg#<techId>`. */
export const techLogoSprite = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(LOGOS)
    .map(
      ([name, icon]) =>
        `<symbol id="${techId(name)}" viewBox="0 0 24 24"><path fill="currentColor" d="${icon.path}"/></symbol>`,
    )
    .join('')}</svg>`;
