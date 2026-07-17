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
import {
  NotificationBellComponent,
  Notification,
  NotificationsStore,
  TranslationService,
} from '../../core';
import { resolveNotificationLink } from '../../core/notifications/resolve-notification-link';
import { AuthStore } from '../../features/auth/application';
import { AnnotationDrawerComponent } from '../../features/notes/presentation';
import { RadarStore } from '../../features/radar/application';
import { RadarNewsNotificationPoller } from '../../features/radar/application/radar-news-notification-poller.service';
import {
  LanguageToggleComponent,
  MidasLogoComponent,
  ThemeToggleComponent,
  UserMenuComponent,
} from '../../shared';
import { ShellRouteTransition, getShellRouteTransition } from './shell-tab-order';
import { ShellSearchResult } from './filter-shell-search';
import { ShellSearchService } from './shell-search.service';

// Routes that hide the shell's demo-disclaimer footer (full-width app views).
const CUSTOM_LAYOUT_ROUTE_PREFIXES = [
  '/radar',
  '/chat',
  '/agents',
  '/scenarios',
  '/briefings',
  '/watchlists',
  '/brand-lab',
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AnnotationDrawerComponent,
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
  readonly search = inject(ShellSearchService);
  private readonly router = inject(Router);
  private readonly radarStore = inject(RadarStore);
  private readonly newsNotificationPoller = inject(RadarNewsNotificationPoller);

  readonly usesCustomLayout = signal(this.hasFeatureOwnedSidebar(this.router.url));
  readonly routeTransition = signal<ShellRouteTransition>('neutral');

  readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.email;
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  private readonly searchHost = viewChild<ElementRef<HTMLElement>>('searchHost');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private previousShellUrl = this.router.url;

  constructor() {
    this.newsNotificationPoller.start();
    void this.search.ensureInstrumentsLoaded();

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

  async onOpenNotification(notification: Notification): Promise<void> {
    const link =
      notification.link ?? resolveNotificationLink(notification.messageKey, notification.detail);
    if (!link) {
      return;
    }

    await this.router.navigate(link.commands, { queryParams: link.queryParams });

    const symbol = link.queryParams?.['symbol'];
    if (symbol) {
      if (this.radarStore.filters().assetClass !== null) {
        await this.radarStore.setAssetClass(null);
      }
      await this.radarStore.setSymbol(symbol);
    }

    this.notifications.dismiss(notification.id);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.setQuery(value);
  }

  async onSearchFocus(): Promise<void> {
    await this.search.ensureInstrumentsLoaded();
    this.search.open();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.search.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.search.moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault();
        void this.search.submitActive();
        break;
      case 'Escape':
        event.preventDefault();
        this.search.close();
        this.searchInput()?.nativeElement.blur();
        break;
    }
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    void this.search.submitActive();
  }

  onSelectResult(result: ShellSearchResult, event: MouseEvent): void {
    event.preventDefault();
    void this.search.select(result);
  }

  resultKey(result: ShellSearchResult): string {
    return this.search.resultKey(result);
  }

  resultHint(result: ShellSearchResult): string {
    switch (result.kind) {
      case 'instrument':
        return this.i18n.t('shell.search.instrumentHint');
      case 'assetClass':
        return this.i18n.t('shell.search.assetClassHint');
      case 'topic':
        return this.i18n.t('shell.search.topicHint');
    }
  }

  /** Cmd/Ctrl+K focuses the shell search input from anywhere in the app. */
  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (!isSearchShortcut) {
      return;
    }
    event.preventDefault();
    void this.focusSearch();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.search.isOpen()) {
      return;
    }
    const host = this.searchHost()?.nativeElement;
    if (host && !host.contains(event.target as Node)) {
      this.search.close();
    }
  }

  private async focusSearch(): Promise<void> {
    await this.search.ensureInstrumentsLoaded();
    const input = this.searchInput()?.nativeElement;
    input?.focus();
    input?.select();
    this.search.open();
  }

  private hasFeatureOwnedSidebar(url: string): boolean {
    return CUSTOM_LAYOUT_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }
}
