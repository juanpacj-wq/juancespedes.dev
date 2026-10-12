import { createProject, type Project } from '../../domain/project/project';
import { parseLocale } from '../../domain/shared/locale';
import type { ProjectFrontmatter } from './schemas';

export class InvalidProjectContentError extends Error {
  constructor(entryId: string, details: readonly string[]) {
    super(`Invalid project "${entryId}":\n  - ${details.join('\n  - ')}`);
    this.name = 'InvalidProjectContentError';
  }
}

/**
 * Projects live in `content/projects/<slug>/<locale>.mdx`, so the entry id is `<slug>/<locale>`.
 * Throws on invalid content: it means the build-time validation was bypassed, which must stop
 * the build rather than publish a broken page.
 */
export const toProject = (entryId: string, data: ProjectFrontmatter): Project => {
  const separator = entryId.lastIndexOf('/');
  const slug = entryId.slice(0, separator);
  const locale = parseLocale(entryId.slice(separator + 1));
  if (separator <= 0 || !locale.ok) {
    throw new InvalidProjectContentError(entryId, ['expected an id like "<slug>/<es|en>"']);
  }

  const project = createProject({ slug, locale: locale.value }, data);
  if (!project.ok) {
    throw new InvalidProjectContentError(
      entryId,
      project.error.map((issue) => `${issue.field}: ${issue.message}`),
    );
  }
  return project.value;
};
