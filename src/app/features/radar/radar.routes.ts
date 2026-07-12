import { Routes } from '@angular/router';
import { NewsDetailPageComponent, RadarPageComponent } from './presentation';

export const RADAR_ROUTES: Routes = [
  { path: '', component: RadarPageComponent },
  { path: 'news/:id', component: NewsDetailPageComponent },
];
