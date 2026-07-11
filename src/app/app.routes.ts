import { Routes } from '@angular/router';
import { ShellComponent } from './layout';
import { ChatPageComponent } from './features/chat/presentation';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'radar' },
      {
        path: 'radar',
        loadChildren: () => import('./features/radar/radar.routes').then((m) => m.RADAR_ROUTES),
      },
      { path: 'chat', component: ChatPageComponent },
      {
        path: 'scenarios',
        loadChildren: () =>
          import('./features/scenarios/scenarios.routes').then((m) => m.SCENARIOS_ROUTES),
      },
      {
        path: 'briefings',
        loadChildren: () =>
          import('./features/briefings/briefings.routes').then((m) => m.BRIEFINGS_ROUTES),
      },
    ],
  },
];
