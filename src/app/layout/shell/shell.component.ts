import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationBellComponent, NotificationsStore, TranslationService } from '../../core';
import { AuthStore } from '../../features/auth/application';
import { LanguageToggleComponent, MidasLogoComponent, ThemeToggleComponent } from '../../shared';

/**
 * Application-wide layout: header (brand + section nav + utilities) + routed content.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent,
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

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
