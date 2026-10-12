import type { Technology } from '../../domain/project/technology';

export interface TechnologyCatalog {
  findAll(): Promise<readonly Technology[]>;
}
