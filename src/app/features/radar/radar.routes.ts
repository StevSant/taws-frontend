import { Routes } from '@angular/router';
import {
  AssetDetailPageComponent,
  NewsDetailPageComponent,
  RadarPageComponent,
} from './presentation';

export const RADAR_ROUTES: Routes = [
  { path: '', component: RadarPageComponent },
  // Static `radar/...` children MUST precede the `:symbol` param route below, or
  // `radar/news/:id` would be captured by `:symbol` (id = "news") and never resolve.
  { path: 'news/:id', component: NewsDetailPageComponent },
  { path: ':symbol', component: AssetDetailPageComponent },
];
