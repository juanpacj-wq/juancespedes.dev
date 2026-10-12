import type { Capability } from './capability';

/**
 * A named technology and the capability it provides evidence for. Projects reference
 * technologies by name; the catalog keeps names consistent ("SQL Server", not "MSSQL").
 */
export interface Technology {
  readonly name: string;
  readonly capability: Capability;
}

export const normalizeTechnologyName = (name: string): string => name.trim().toLowerCase();
