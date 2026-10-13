import { parseIsoDate, type IsoDate } from '../shared/iso-date';
import { err, ok, type Result } from '../shared/result';

/*
 * The "now" page (nownownow.com): what I am focused on at this point in my life. It is only
 * honest if it says when it was written, so the update date is required and shown.
 */

export interface NowSection {
  readonly title: string;
  readonly items: readonly string[];
}

export interface NowContent {
  readonly updated: string;
  readonly sections: readonly NowSection[];
}

export interface NowPage extends Omit<NowContent, 'updated'> {
  readonly updated: IsoDate;
}

export interface NowIssue {
  readonly field: string;
  readonly message: string;
}

export const createNowPage = (content: NowContent): Result<NowPage, readonly NowIssue[]> => {
  const updated = parseIsoDate(content.updated);
  const issues: NowIssue[] = [];
  if (!updated.ok) issues.push({ field: 'updated', message: 'expected YYYY-MM-DD' });
  if (content.sections.length === 0) {
    issues.push({ field: 'sections', message: 'the page needs at least one section' });
  }
  content.sections.forEach((section, index) => {
    if (section.items.length === 0) {
      issues.push({ field: `sections[${String(index)}].items`, message: 'a section needs items' });
    }
  });
  if (!updated.ok || issues.length > 0) return err(issues);
  return ok({ ...content, updated: updated.value });
};
