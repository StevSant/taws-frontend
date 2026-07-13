import { parseLocale } from '../i18n/parse-locale';
import { UserProfileDto } from './user-profile-dto';
import { UserProfile } from './user-profile.model';

/**
 * Maps the wire DTO onto the domain model.
 *
 * `preferred_locale` is a free-form BCP-47-ish `text` column server-side, so a value this
 * UI has no dictionary for (`fr`, `es-MX`) narrows to `null` — "no usable preference" —
 * rather than being forced into a `Locale` it isn't.
 */
export function mapUserProfileDto(dto: UserProfileDto): UserProfile {
  return {
    userId: dto.user_id,
    preferredLocale: parseLocale(dto.preferred_locale),
  };
}
