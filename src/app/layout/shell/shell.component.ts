import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  Locale,
  NotificationBellComponent,
  NotificationsStore,
  TranslationService,
} from '../../core';
import { AuthStore } from '../../features/auth/application';
import { NeuralOrbComponent } from '../../shared';

const CLOCK_TICK_MS = 1000;

/**
 * Application-wide layout: header (brand + section nav + notification bell +
 * language toggle + login/logout) + routed content. Routed as the root
 * component in app.routes.ts so every page renders inside it.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent,
    NeuralOrbComponent,
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
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(new Date());

  /** JetBrains-Mono-rendered HH:MM:SS clock, ticking every second. */
  readonly clockLabel = computed(() =>
    this.now().toLocaleTimeString(this.i18n.locale() === 'es' ? 'es-ES' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  );

  constructor() {
    const intervalId = setInterval(() => this.now.set(new Date()), CLOCK_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
  }

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
