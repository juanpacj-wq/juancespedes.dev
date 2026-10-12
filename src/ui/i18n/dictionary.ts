import type { Locale } from '../../domain/shared/locale';

/*
 * Interface strings. Content (projects, metrics) lives in content/; this file only holds the
 * words of the interface itself. English is typed against Spanish, so a missing or extra key in
 * either language is a compile error.
 */

const es = {
  meta: {
    siteName: 'Juan Céspedes',
    defaultDescription:
      'Ingeniero de sistemas en Barranquilla: desarrollo full-stack, datos y automatización.',
  },
  a11y: {
    skipToContent: 'Saltar al contenido',
    mainNavigation: 'Navegación principal',
    external: '(se abre en otra pestaña)',
  },
  nav: {
    projects: 'Proyectos',
    skills: 'Capacidades',
    services: 'Servicios',
    contact: 'Contacto',
  },
  theme: {
    toLight: 'Cambiar a tema claro',
    toDark: 'Cambiar a tema oscuro',
  },
  availability: {
    available: 'Disponible para proyectos',
  },
  profile: {
    name: 'Juan Céspedes',
    role: 'Ingeniero de sistemas · full-stack · datos · automatización',
    location: 'Barranquilla, Colombia · remoto',
    portraitAlt: 'Retrato de Juan Céspedes',
  },
  footer: {
    builtInPublic: 'Construido en público.',
    sourceCode: 'Código fuente',
    rights: 'Contenido © Juan Pablo Céspedes. Código con licencia MIT.',
  },
  metric: {
    source: 'Fuente',
  },
  home: {
    buildingInPublic:
      'Este sitio se está construyendo en público: el código, las decisiones de arquitectura y las pruebas están en el repositorio.',
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof es>;

const en: Dictionary = {
  meta: {
    siteName: 'Juan Céspedes',
    defaultDescription:
      'Systems engineer in Barranquilla, Colombia: full-stack development, data and automation.',
  },
  a11y: {
    skipToContent: 'Skip to content',
    mainNavigation: 'Main navigation',
    external: '(opens in a new tab)',
  },
  nav: {
    projects: 'Projects',
    skills: 'Capabilities',
    services: 'Services',
    contact: 'Contact',
  },
  theme: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
  },
  availability: {
    available: 'Available for projects',
  },
  profile: {
    name: 'Juan Céspedes',
    role: 'Systems engineer · full-stack · data · automation',
    location: 'Barranquilla, Colombia · remote',
    portraitAlt: 'Portrait of Juan Céspedes',
  },
  footer: {
    builtInPublic: 'Built in public.',
    sourceCode: 'Source code',
    rights: 'Content © Juan Pablo Céspedes. Code under the MIT license.',
  },
  metric: {
    source: 'Source',
  },
  home: {
    buildingInPublic:
      'This site is being built in public: the code, the architecture decisions and the tests are in the repository.',
  },
};

const dictionaries: Readonly<Record<Locale, Dictionary>> = { es, en };

export const dictionaryFor = (locale: Locale): Dictionary => dictionaries[locale];
