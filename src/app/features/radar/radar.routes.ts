import { Routes } from '@angular/router';
import {
  AssetDetailPageComponent,
  MacroDetailPageComponent,
  MarketsExplorerPageComponent,
  NewsDetailPageComponent,
  NewsListPageComponent,
  RadarPageComponent,
} from './presentation';

export const RADAR_ROUTES: Routes = [
  { path: '', component: RadarPageComponent },
  // Static `radar/...` children MUST precede the `:symbol` param route below, or
  // `radar/explore` / `radar/news` / `radar/news/:id` / `radar/macro/:indicator` would be
  // captured by `:symbol` and never resolve.
  { path: 'explore', component: MarketsExplorerPageComponent },
  { path: 'news', component: NewsListPageComponent },
  { path: 'news/:id', component: NewsDetailPageComponent },
  { path: 'macro/:indicator', component: MacroDetailPageComponent },
  { path: ':symbol', component: AssetDetailPageComponent },
];
