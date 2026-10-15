import {
  siApacheairflow,
  siDirectus,
  siDocker,
  siExpress,
  siGithubactions,
  siGnubash,
  siLinux,
  siMariadb,
  siModelcontextprotocol,
  siMongodb,
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
  siTypescript,
  siVite,
  siWordpress,
  type SimpleIcon,
} from 'simple-icons';

/*
 * Logos for the technologies band of a case study (ADR 0023). Paths come from Simple Icons
 * (CC0), inlined at build time: no request and no client code. A technology without a free,
 * faithful logo (Microsoft products, systemd, Oracle, protocols, practices) is shown as a
 * wordmark instead, so the band never shows a wrong or invented mark.
 */

const LOGOS: Readonly<Record<string, SimpleIcon>> = {
  'Apache Airflow': siApacheairflow,
  Bash: siGnubash,
  Directus: siDirectus,
  Docker: siDocker,
  Express: siExpress,
  'GitHub Actions': siGithubactions,
  Linux: siLinux,
  MariaDB: siMariadb,
  'Model Context Protocol': siModelcontextprotocol,
  MongoDB: siMongodb,
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
  TypeScript: siTypescript,
  Vite: siVite,
  WordPress: siWordpress,
};

export interface TechLogo {
  readonly path: string;
  /** Brand colour as six hex digits, without the hash. */
  readonly hex: string;
  /** Whether the brand colour keeps 3:1 against the dark and the light canvas. */
  readonly onDark: boolean;
  readonly onLight: boolean;
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
 * Both canvases are near the ends of the scale (luminance about 0.004 dark and 0.95 light), so
 * 3:1 for a graphic means a luminance of at least 0.1 on dark and at most 0.28 on light. A brand
 * colour outside its range is drawn in the ink colour for that theme.
 */
const DARK_MIN = 0.1;
const LIGHT_MAX = 0.28;

export const logoFor = (name: string): TechLogo | null => {
  const icon = LOGOS[name];
  if (!icon) return null;
  const value = luminance(icon.hex);
  return { path: icon.path, hex: icon.hex, onDark: value >= DARK_MIN, onLight: value <= LIGHT_MAX };
};
