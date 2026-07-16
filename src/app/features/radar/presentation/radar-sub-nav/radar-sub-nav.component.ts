import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslationService } from '../../../../core';

/**
 * Sub-navigation for the radar family (`/radar`, `/radar/explore`, `/radar/news`).
 *
 * Markets and News are routed as children of the radar but used to sit as top-level shell tabs, so
 * the nav claimed seven flat destinations for five real ones — and seven does not fit a phone in
 * either locale. Demoting them here makes the nav match the route tree and leaves the shell with
 * five tabs.
 *
 * Rendered by each of the three pages rather than by a layout route: wrapping them would mean a
 * `path: ''` parent whose children must then cover `news/:id`, `macro/:indicator` and `:symbol`
 * too, since the router will not fall back to sibling configs once an empty-prefix parent matches.
 */
@Component({
  selector: 'app-radar-sub-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './radar-sub-nav.component.html',
  styleUrl: './radar-sub-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarSubNavComponent {
  constructor(readonly i18n: TranslationService) {}
}
