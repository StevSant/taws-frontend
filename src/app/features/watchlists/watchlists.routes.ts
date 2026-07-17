import { Routes } from '@angular/router';
import { WatchlistDetailPageComponent, WatchlistsPageComponent } from './presentation';

export const WATCHLISTS_ROUTES: Routes = [
  { path: '', component: WatchlistsPageComponent },
  // `watchlists/:id` renders a real per-list detail page (hero read + historical outlook + every
  // member). This also serves the Watchdog-alert and daily-briefing link-backs
  // (`/watchlists/{id}?signal={id}`), which previously fell through to the manage page.
  { path: ':id', component: WatchlistDetailPageComponent },
];
