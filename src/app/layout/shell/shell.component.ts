import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  Locale,
  NotificationBellComponent,
  NotificationsStore,
  TranslationService,
} from '../../core';
import { AuthStore } from '../../features/auth/application';

/**
 * Application-wide layout: header (brand + section nav + notification bell +
 * language toggle + login/logout) + routed content. Routed as the root
 * component in app.routes.ts so every page renders inside it.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  constructor(
    readonly i18n: TranslationService,
    readonly auth: AuthStore,
    readonly notifications: NotificationsStore,
    private readonly router: Router,
  ) {}

  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
  }

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
