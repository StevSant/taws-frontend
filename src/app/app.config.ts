import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core';
import { AuthStore } from './features/auth/application';
import { AuthRepository } from './features/auth/domain';
import { SupabaseAuthRepository } from './features/auth/infrastructure';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: AuthRepository, useClass: SupabaseAuthRepository },
    // Restores any persisted Supabase session before the router's initial
    // navigation runs, so authGuard never sees a false "logged out" on
    // refresh (provideRouter blocks initial navigation on app initializers
    // by default).
    provideAppInitializer(() => inject(AuthStore).initialize()),
  ],
};
