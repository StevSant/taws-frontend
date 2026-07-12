import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  NotificationBellComponent,
  NotificationsStore,
  TranslationService,
} from '../../core';
import { AuthStore } from '../../features/auth/application';
import { LanguageToggleComponent, MidasLogoComponent, ThemeToggleComponent } from '../../shared';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent,
    SidebarComponent,
    MidasLogoComponent,
    ThemeToggleComponent,
    LanguageToggleComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly i18n = inject(TranslationService);
  readonly auth = inject(AuthStore);
  readonly notifications = inject(NotificationsStore);
  private readonly router = inject(Router);

  readonly isChatRoute = signal(this.router.url.startsWith('/chat'));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isChatRoute.set(this.router.url.startsWith('/chat'));
      });
  }

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
