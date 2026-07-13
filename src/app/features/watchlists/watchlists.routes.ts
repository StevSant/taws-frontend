import { Routes } from '@angular/router';
import { WatchlistsPageComponent } from './presentation';

export const WATCHLISTS_ROUTES: Routes = [
  { path: '', component: WatchlistsPageComponent },
  // `watchlists/:id` has no dedicated detail page, but Watchdog alerts and daily-briefing
  // notifications have been composing `/watchlists/{id}?signal={id}` link-backs since they
  // shipped — with no route to match, those landed on a blank screen. Rendering the list
  // page here keeps every already-delivered Telegram link working instead of white-paging.
  { path: ':id', component: WatchlistsPageComponent },
];
