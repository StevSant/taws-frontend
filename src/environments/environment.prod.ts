/**
 * Production environment configuration.
 * Swapped in for environment.ts during production builds (see angular.json fileReplacements).
 * Set the real API URL via build-time replacement or a hosting platform env var if needed.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8000',
};
