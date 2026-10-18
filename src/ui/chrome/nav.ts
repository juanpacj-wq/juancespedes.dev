import type { WorkMenuArea } from '../project/work-menu';

/** A link in the header menu. */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** The projects by area of work, opened from the item (hover, or its arrow button). */
  readonly menu?: readonly WorkMenuArea[];
}
