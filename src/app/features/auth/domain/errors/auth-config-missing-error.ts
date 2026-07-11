/**
 * Thrown by an `AuthRepository` adapter when authentication cannot be used
 * because it is missing required configuration (e.g. no Supabase anon key).
 * Lets `AuthStore` distinguish this case from an arbitrary provider error
 * without depending on the adapter's exact message text.
 */
export class AuthConfigMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigMissingError';
  }
}
