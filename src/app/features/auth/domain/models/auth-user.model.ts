/** The authenticated principal — intentionally minimal (T0 needs id + email only). */
export interface AuthUser {
  id: string;
  email: string | null;
}
