import { Routes } from '@angular/router';
import { authGuard } from '../../core';
import { ChatPageComponent } from './presentation';

export const CHAT_ROUTES: Routes = [
  { path: '', component: ChatPageComponent, canActivate: [authGuard] },
];
