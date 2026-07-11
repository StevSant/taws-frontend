/**
 * Thrown by an `AuthRepository` adapter when a sign-in call succeeds at the
 * provider but yields no usable session. Lets `AuthStore` distinguish this
 * case from an arbitrary provider error without depending on the adapter's
 * exact message text.
 */
export class AuthNoSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthNoSessionError';
  }
}
