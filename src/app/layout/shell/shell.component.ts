import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideSearch } from '@lucide/angular';
import { NotificationBellComponent, NotificationsStore, TranslationService } from '../../core';
import { AuthStore } from '../../features/auth/application';
import { LanguageToggleComponent, MidasLogoComponent, ThemeToggleComponent } from '../../shared';

// Routes that render their own full-width page content (brand mark moves into
// the topbar, and the shell's demo-disclaimer footer is hidden). No route
// renders a left sidebar/nav anymore — this only gates topbar/footer chrome.
const CUSTOM_LAYOUT_ROUTE_PREFIXES = ['/chat', '/scenarios', '/briefings'];

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

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.usesCustomLayout.set(this.hasFeatureOwnedSidebar(this.router.url));
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
