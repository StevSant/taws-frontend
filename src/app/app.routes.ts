import { Routes } from '@angular/router';
import { ShellComponent } from './layout';
import { ChatPageComponent } from './features/chat/presentation';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [{ path: '', component: ChatPageComponent }],
  },
];
