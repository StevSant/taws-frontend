import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { Locale } from '../i18n/locale.model';
import { mapUserProfileDto } from './map-user-profile-dto';
import { ProfileRepository } from './profile-repository';
import { UpdateUserProfileRequestDto } from './update-user-profile-request-dto';
import { UserProfileDto } from './user-profile-dto';
import { UserProfile } from './user-profile.model';

const PROFILE_PATH = '/api/v1/profile';

/**
 * Infrastructure adapter for `ProfileRepository`, calling `GET`/`PATCH /api/v1/profile`.
 * Both endpoints require a bearer token — the app-wide `authInterceptor` attaches it — so
 * callers must only reach for this once a session exists (see `LocalePreferenceService`).
 */
@Injectable()
export class HttpProfileRepository extends ProfileRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchProfile(): Promise<UserProfile> {
    const dto = await firstValueFrom(
      this.http.get<UserProfileDto>(`${this.config.apiBaseUrl}${PROFILE_PATH}`),
    );
    return mapUserProfileDto(dto);
  }

  async savePreferredLocale(locale: Locale): Promise<UserProfile> {
    const payload: UpdateUserProfileRequestDto = { preferred_locale: locale };
    const dto = await firstValueFrom(
      this.http.patch<UserProfileDto>(`${this.config.apiBaseUrl}${PROFILE_PATH}`, payload),
    );
    return mapUserProfileDto(dto);
  }
}
