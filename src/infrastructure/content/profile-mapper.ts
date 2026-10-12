import type { Profile } from '../../domain/profile/profile';
import { parseYearMonth, type Period } from '../../domain/shared/year-month';
import type { ProfileEntry } from './schemas';

const toPeriod = ({ start, end }: { start: string; end: string | null }): Period => {
  const from = parseYearMonth(start);
  const to = end === null ? null : parseYearMonth(end);
  if (!from.ok || (to && !to.ok)) throw new Error(`invalid period ${start} to ${String(end)}`);
  return { start: from.value, end: to?.ok ? to.value : null };
};

/** Maps a validated profile file to the domain shape (typed periods). */
export const toProfile = (entry: ProfileEntry): Profile => ({
  ...entry,
  experience: entry.experience.map((item) => ({ ...item, period: toPeriod(item.period) })),
  education: entry.education.map((item) => ({ ...item, period: toPeriod(item.period) })),
});
