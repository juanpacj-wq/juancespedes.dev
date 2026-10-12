/** Public facts about the site and its owner, shared by pages, metadata and structured data. */
export const SITE = {
  url: 'https://juancespedes.dev',
  email: 'juanpablocespedesj@gmail.com',
  githubUrl: 'https://github.com/juanpacj-wq',
  linkedinUrl: 'https://www.linkedin.com/in/juan-cespedesjc',
  repositoryUrl: 'https://github.com/juanpacj-wq/juancespedes.dev',
  locality: 'Barranquilla',
  country: 'CO',
} as const;

/** Absolute URL for a site path, e.g. `/en/projects/x` to `https://juancespedes.dev/en/projects/x`. */
export const absoluteUrl = (path: string): string => new URL(path, SITE.url).href;
