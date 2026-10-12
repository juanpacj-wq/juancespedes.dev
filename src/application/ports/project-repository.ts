import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';

/** Source of validated projects. Drafts are included; use cases decide what to show. */
export interface ProjectRepository {
  findAll(locale: Locale): Promise<readonly Project[]>;
}
