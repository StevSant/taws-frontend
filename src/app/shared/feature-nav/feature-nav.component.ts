import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideBell,
  LucideBookmark,
  LucideFileText,
  LucideFlaskConical,
  LucideHistory,
  LucideHome,
  LucideLayoutTemplate,
  LucideSettings,
  LucideSlidersHorizontal,
  LucideStar,
} from '@lucide/angular';

export interface FeatureNavItem {
  /** Icon key rendered via the `@switch` in the template — see `FeatureNavComponent`'s supported keys. */
  readonly icon: string;
  readonly label: string;
  readonly route: string;
  readonly exact?: boolean;
}

@Component({
  selector: 'app-feature-nav',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideFlaskConical,
    LucideBookmark,
    LucideLayoutTemplate,
    LucideSlidersHorizontal,
    LucideHistory,
    LucideFileText,
    LucideSettings,
    LucideHome,
    LucideStar,
    LucideBell,
  ],
  templateUrl: './feature-nav.component.html',
  styleUrl: './feature-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureNavComponent {
  readonly brandLabel = input<string>('');
  readonly items = input.required<readonly FeatureNavItem[]>();
}
