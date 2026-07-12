import { Routes } from '@angular/router';
import { ScenarioResultPageComponent, ScenariosPageComponent } from './presentation';

export const SCENARIOS_ROUTES: Routes = [
  { path: '', component: ScenariosPageComponent },
  { path: ':id', component: ScenarioResultPageComponent },
];
