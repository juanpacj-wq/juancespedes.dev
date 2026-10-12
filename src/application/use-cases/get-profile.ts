import { sortByRecency, type Profile } from '../../domain/profile/profile';
import type { Locale } from '../../domain/shared/locale';
import type { ProfileRepository } from '../ports/profile-repository';

/** The owner's profile with work history and education ordered from most recent. */
export const makeGetProfile =
  (profiles: ProfileRepository) =>
  async (locale: Locale): Promise<Profile> => {
    const profile = await profiles.get(locale);
    return {
      ...profile,
      experience: sortByRecency(profile.experience),
      education: sortByRecency(profile.education),
    };
  };
