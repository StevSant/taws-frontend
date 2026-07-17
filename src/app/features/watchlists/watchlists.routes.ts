import { Routes } from '@angular/router';
import {
  WatchlistDetailPageComponent,
  WatchlistFormPageComponent,
  WatchlistsOverviewPageComponent,
} from './presentation';

export const WATCHLISTS_ROUTES: Routes = [
  { path: '', component: WatchlistsOverviewPageComponent },
  // `new` before `:id` so the literal segment wins over the id matcher.
  { path: 'new', component: WatchlistFormPageComponent },
  { path: ':id/edit', component: WatchlistFormPageComponent },
  // `watchlists/:id` renders the per-list detail page (hero read + historical outlook + members).
  // Also serves the Watchdog-alert / daily-briefing link-backs (`/watchlists/{id}?signal={id}`).
  { path: ':id', component: WatchlistDetailPageComponent },
];
