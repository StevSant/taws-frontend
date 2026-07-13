/** Request body of `PATCH /api/v1/profile` — see backend `update_user_profile_request.py`. */
export interface UpdateUserProfileRequestDto {
  preferred_locale: string | null;
}
