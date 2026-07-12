import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideLucideConfig } from '@lucide/angular';

import { routes } from './app.routes';
import { authErrorInterceptor, authInterceptor, ThemeService } from './core';
import { AuthStore } from './features/auth/application';
import { AuthRepository } from './features/auth/domain';
import { SupabaseAuthRepository } from './features/auth/infrastructure';
import {
  BriefingRepository,
  ReviewRepository,
  WatchlistRepository,
} from './features/briefings/domain';
import {
  HttpBriefingRepository,
  HttpReviewRepository,
  HttpWatchlistRepository,
} from './features/briefings/infrastructure';
import {
  InstrumentRepository,
  MacroRepository,
  MarketsRepository,
  SentimentRepository,
  NewsRepository,
  QuantRepository,
  SignalRepository,
  SignalReviewRepository,
} from './features/radar/domain';
import {
  HttpInstrumentRepository,
  HttpMacroRepository,
  HttpMarketsRepository,
  HttpSentimentRepository,
  HttpNewsRepository,
  HttpQuantRepository,
  HttpSignalRepository,
  HttpSignalReviewRepository,
} from './features/radar/infrastructure';
import { ScenarioRepository } from './features/scenarios/domain';
import { HttpScenarioRepository } from './features/scenarios/infrastructure';
import { ChartRepository, HttpChartRepository } from './shared/charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideLucideConfig({ strokeWidth: 1.75 }),
    // `authErrorInterceptor` is registered first (outermost) so its 401 retry
    // replays through `authInterceptor` and re-attaches the refreshed token.
    provideHttpClient(withInterceptors([authErrorInterceptor, authInterceptor])),
    { provide: AuthRepository, useClass: SupabaseAuthRepository },
    { provide: NewsRepository, useClass: HttpNewsRepository },
    { provide: InstrumentRepository, useClass: HttpInstrumentRepository },
    { provide: SignalRepository, useClass: HttpSignalRepository },
    { provide: SignalReviewRepository, useClass: HttpSignalReviewRepository },
    { provide: QuantRepository, useClass: HttpQuantRepository },
    { provide: MacroRepository, useClass: HttpMacroRepository },
    { provide: MarketsRepository, useClass: HttpMarketsRepository },
    { provide: SentimentRepository, useClass: HttpSentimentRepository },
    { provide: WatchlistRepository, useClass: HttpWatchlistRepository },
    { provide: BriefingRepository, useClass: HttpBriefingRepository },
    { provide: ReviewRepository, useClass: HttpReviewRepository },
    { provide: ScenarioRepository, useClass: HttpScenarioRepository },
    { provide: ChartRepository, useClass: HttpChartRepository },
    // Restores Supabase session in the background so the shell + Radar can
    // paint immediately. `authGuard` waits for `AuthStore.ready` on guarded
    // routes so a refresh on /briefings doesn't false-redirect to login.
    provideAppInitializer(() => {
      void inject(AuthStore).initialize();
    }),
    provideAppInitializer(() => {
      const theme = inject(ThemeService);
      theme.setTheme(theme.theme());
    }),
  ],
};
