import type { NowPage } from '../../domain/now/now-page';
import type { Profile } from '../../domain/profile/profile';
import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import type { Note } from '../../domain/writing/note';
import type { Dictionary } from '../i18n/dictionary';
import { formatMoney, formatPeriod } from '../i18n/format';
import { notePath, nowPath, projectPath } from '../i18n/routes';

/*
 * The text the "Ask me" assistant answers from (ADR 0017): everything published on the site, in
 * one language, as plain text with the site path of each project and note so answers can link to
 * them. It is built at build time into /chat-corpus/<lang>.txt and must be byte-stable between
 * builds of the same content, because it is the cached part of every request.
 */

export interface CorpusSources {
  readonly t: Dictionary;
  readonly locale: Locale;
  readonly email: string;
  readonly profile: Profile;
  readonly projects: readonly Project[];
  readonly notes: readonly Note[];
  readonly now: NowPage;
}

const LABELS = {
  es: {
    heading: 'Portafolio de',
    contact: 'Correo de contacto',
    experience: 'Experiencia',
    education: 'Formación',
    credentials: 'Credenciales',
    services: 'Servicios',
    deliverables: 'Entregables',
    process: 'Forma de trabajo',
    pricing: 'Precio',
    from: 'Desde',
    quoted: 'Precio por cotización',
    projects: 'Proyectos',
    page: 'Página',
    kind: 'Tipo',
    period: 'Periodo',
    role: 'Rol',
    stack: 'Tecnologías',
    confidentiality: 'Confidencialidad',
    anonymized: 'sistema interno anonimizado (sin nombres de la empresa, clientes ni datos reales)',
    public: 'trabajo público',
    summary: 'Resumen',
    problem: 'Problema',
    responsibilities: 'Qué hizo',
    constraints: 'Restricciones',
    decisions: 'Decisiones',
    discarded: 'descartado',
    architecture: 'Arquitectura',
    outcomes: 'Resultados',
    metrics: 'Cifras',
    source: 'fuente',
    lessons: 'Qué haría distinto',
    links: 'Enlaces públicos',
    notes: 'Notas técnicas',
    now: 'Ahora',
    updated: 'actualizado el',
  },
  en: {
    heading: 'Portfolio of',
    contact: 'Contact email',
    experience: 'Experience',
    education: 'Education',
    credentials: 'Credentials',
    services: 'Services',
    deliverables: 'Deliverables',
    process: 'How engagements work',
    pricing: 'Pricing',
    from: 'From',
    quoted: 'Price quoted per requirement',
    projects: 'Projects',
    page: 'Page',
    kind: 'Kind',
    period: 'Period',
    role: 'Role',
    stack: 'Technologies',
    confidentiality: 'Confidentiality',
    anonymized: 'anonymized internal system (no company, client names or real data)',
    public: 'public work',
    summary: 'Summary',
    problem: 'Problem',
    responsibilities: 'What he did',
    constraints: 'Constraints',
    decisions: 'Decisions',
    discarded: 'ruled out',
    architecture: 'Architecture',
    outcomes: 'Results',
    metrics: 'Figures',
    source: 'source',
    lessons: 'What he would do differently',
    links: 'Public links',
    notes: 'Technical notes',
    now: 'Now',
    updated: 'updated on',
  },
} as const;

const bullets = (items: readonly string[]): string[] => items.map((item) => `- ${item}`);

const projectSection = (
  project: Project,
  locale: Locale,
  t: Dictionary,
  l: (typeof LABELS)[Locale],
): string[] => {
  const lines = [
    `### ${project.title}`,
    `${l.page}: ${projectPath(locale, project.slug)}`,
    `${l.kind}: ${t.kindLabels[project.kind]}. ${l.period}: ${formatPeriod(locale, project.period, t)}.`,
    `${l.role}: ${project.role}`,
    `${l.stack}: ${project.stack.join(', ')}`,
    `${l.confidentiality}: ${project.confidentiality === 'anonymized' ? l.anonymized : l.public}`,
    `${l.summary}: ${project.summary}`,
  ];
  if (project.metrics.length > 0) {
    lines.push(
      `${l.metrics}:`,
      ...bullets(project.metrics.map((m) => `${m.value}: ${m.label} (${l.source}: ${m.source})`)),
    );
  }
  if (project.links.length > 0) {
    lines.push(
      `${l.links}: ${project.links.map((link) => `${link.label} ${link.url}`).join('; ')}`,
    );
  }
  if (project.kind === 'case-study') {
    lines.push(
      `${l.problem}: ${project.problem}`,
      ...(project.responsibilities.length > 0
        ? [`${l.responsibilities}:`, ...bullets(project.responsibilities)]
        : []),
      `${l.constraints}:`,
      ...bullets(project.constraints),
      `${l.decisions}:`,
      ...bullets(
        project.decisions.map(
          (d) =>
            `${d.title}. ${d.rationale}${d.alternatives.length > 0 ? ` (${l.discarded}: ${d.alternatives.join('; ')})` : ''}`,
        ),
      ),
      `${l.architecture}: ${project.architecture.summary}`,
      ...bullets(
        project.architecture.layers.map(
          (layer) => `${layer.name}: ${layer.nodes.map((node) => node.label).join(', ')}`,
        ),
      ),
      `${l.outcomes}:`,
      ...bullets(project.outcomes),
      `${l.lessons}:`,
      ...bullets(project.lessons),
    );
  }
  return [...lines, ''];
};

export const buildCorpus = ({
  t,
  locale,
  email,
  profile,
  projects,
  notes,
  now,
}: CorpusSources): string => {
  const l = LABELS[locale];
  const lines = [
    `# ${l.heading} ${t.profile.name}`,
    `${t.profile.role}. ${t.profile.location}.`,
    t.hero.pitch,
    `${l.contact}: ${email}`,
    '',
    `## ${l.experience}`,
    ...profile.experience.flatMap((job) => [
      `- ${job.organization}, ${job.role}, ${job.location}, ${formatPeriod(locale, job.period, t)}. ${job.summary}`,
      ...job.highlights.map((highlight) => `  - ${highlight}`),
    ]),
    '',
    `## ${l.education}`,
    ...bullets(
      profile.education.map(
        (item) => `${item.degree}, ${item.institution}, ${formatPeriod(locale, item.period, t)}`,
      ),
    ),
    '',
    `## ${l.credentials}`,
    ...bullets(profile.credentials.map((c) => `${c.name}, ${c.issuer}, ${c.issued}`)),
    '',
    `## ${l.services}`,
    ...profile.services.flatMap((service) => [
      `- ${service.title}: ${service.summary} ${l.deliverables}: ${service.deliverables.join('; ')}. ${service.price.from === null ? l.quoted : `${l.from} ${formatMoney(locale, service.price.from, profile.currency)} ${profile.currency}`} (${service.price.scope}).`,
    ]),
    `${l.process}: ${profile.process.map((step) => `${step.title} (${step.description})`).join('; ')}`,
    `${l.pricing}: ${profile.pricing}`,
    '',
    `## ${l.projects}`,
    '',
    ...projects.flatMap((project) => projectSection(project, locale, t, l)),
    `## ${l.notes}`,
    ...bullets(
      notes.map((note) => `${note.title} (${notePath(locale, note.slug)}): ${note.summary}`),
    ),
    '',
    `## ${l.now} (${nowPath(locale)}, ${l.updated} ${now.updated})`,
    ...now.sections.flatMap((section) => [`${section.title}:`, ...bullets(section.items)]),
    '',
  ];
  return lines.join('\n');
};
