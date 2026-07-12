import { Routes } from '@angular/router';
import {
  AssetDetailPageComponent,
  MarketsExplorerPageComponent,
  NewsDetailPageComponent,
  RadarPageComponent,
} from './presentation';

export const RADAR_ROUTES: Routes = [
  { path: '', component: RadarPageComponent },
  // Static `radar/...` children MUST precede the `:symbol` param route below, or
  // `radar/explore` / `radar/news/:id` would be captured by `:symbol` and never resolve.
  { path: 'explore', component: MarketsExplorerPageComponent },
  { path: 'news/:id', component: NewsDetailPageComponent },
  { path: ':symbol', component: AssetDetailPageComponent },
];
