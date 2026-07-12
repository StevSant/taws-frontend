import { Routes } from '@angular/router';
import { ShellComponent } from './layout';
import { authGuard } from './core';

export const routes: Routes = [
  {
    // Outside ShellComponent — the login screen doesn't show the app nav.
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'radar' },
      {
        path: 'radar',
        loadChildren: () => import('./features/radar/radar.routes').then((m) => m.RADAR_ROUTES),
      },
      {
        path: 'chat',
        loadChildren: () => import('./features/chat/chat.routes').then((m) => m.CHAT_ROUTES),
      },
      {
        path: 'scenarios',
        loadChildren: () =>
          import('./features/scenarios/scenarios.routes').then((m) => m.SCENARIOS_ROUTES),
      },
      {
        // Guarded: briefing generation and the review workflow require an
        // authenticated Supabase JWT on the backend (unlike radar, whose
        // GET /news and GET /instruments are unauthenticated).
        path: 'briefings',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/briefings/briefings.routes').then((m) => m.BRIEFINGS_ROUTES),
      },
    ],
  },
];
