import type { Profile } from '../../domain/profile/profile';
import type { Locale } from '../../domain/shared/locale';

export interface ProfileRepository {
  get(locale: Locale): Promise<Profile>;
}
