import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideSearch } from '@lucide/angular';
import { NotificationBellComponent, NotificationsStore, TranslationService } from '../../core';
import { AuthStore } from '../../features/auth/application';
import {
  LanguageToggleComponent,
  MidasLogoComponent,
  ThemeToggleComponent,
  UserMenuComponent,
} from '../../shared';
import { ShellRouteTransition, getShellRouteTransition } from './shell-tab-order';

// Routes that hide the shell's demo-disclaimer footer (full-width app views).
const CUSTOM_LAYOUT_ROUTE_PREFIXES = ['/radar', '/chat', '/scenarios', '/briefings', '/brand-lab'];

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
    UserMenuComponent,
    LucideSearch,
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

  readonly usesCustomLayout = signal(this.hasFeatureOwnedSidebar(this.router.url));
  readonly routeTransition = signal<ShellRouteTransition>('neutral');

  readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.email;
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private previousShellUrl = this.router.url;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigation = event as NavigationEnd;
        this.routeTransition.set(
          getShellRouteTransition(this.previousShellUrl, navigation.urlAfterRedirects),
        );
        this.previousShellUrl = navigation.urlAfterRedirects;
        this.usesCustomLayout.set(this.hasFeatureOwnedSidebar(navigation.urlAfterRedirects));
      });
  }

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }

  /** Cmd/Ctrl+K focuses the shell search input from anywhere in the app. */
  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (!isSearchShortcut) {
      return;
    }
    event.preventDefault();
    const input = this.searchInput()?.nativeElement;
    input?.focus();
    input?.select();
  }

  private hasFeatureOwnedSidebar(url: string): boolean {
    return CUSTOM_LAYOUT_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }
}
