import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideBell,
  LucideFileText,
  LucideFlaskConical,
  LucideLineChart,
  LucideNewspaper,
  LucideRadar,
  LucideSettings,
  LucideStar,
} from '@lucide/angular';
import { TranslationKey, TranslationService } from '../../core';
import { MidasLogoComponent } from '../../shared';

interface SidebarItem {
  labelKey: TranslationKey;
  route: string;
  icon:
    | 'radar'
    | 'news'
    | 'instruments'
    | 'briefings'
    | 'alerts'
    | 'scenarios'
    | 'watchlists'
    | 'settings';
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { labelKey: 'shell.sidebar.radar', route: '/radar', icon: 'radar' },
  { labelKey: 'shell.sidebar.news', route: '/radar', icon: 'news' },
  { labelKey: 'shell.sidebar.instruments', route: '/radar', icon: 'instruments' },
  { labelKey: 'shell.sidebar.briefings', route: '/briefings', icon: 'briefings' },
  { labelKey: 'shell.sidebar.alerts', route: '/briefings', icon: 'alerts' },
  { labelKey: 'shell.sidebar.scenarios', route: '/scenarios', icon: 'scenarios' },
  { labelKey: 'shell.sidebar.watchlists', route: '/watchlists', icon: 'watchlists' },
  { labelKey: 'shell.sidebar.settings', route: '/radar', icon: 'settings' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MidasLogoComponent,
    LucideRadar,
    LucideNewspaper,
    LucideLineChart,
    LucideFileText,
    LucideBell,
    LucideFlaskConical,
    LucideStar,
    LucideSettings,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly i18n = inject(TranslationService);
  readonly items = SIDEBAR_ITEMS;
}
