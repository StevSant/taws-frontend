/** Wire shape of `GET`/`PATCH /api/v1/profile` — see backend `user_profile_response.py`. */
export interface UserProfileDto {
  user_id: string;
  preferred_locale: string | null;
}
