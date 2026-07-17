import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { EmptyStateComponent, FeaturePageHeaderComponent } from '../../../../shared';
import { WatchlistSummaryCardComponent } from '../../../radar/presentation';
import { WatchlistsOverviewStore } from '../../application';

/**
 * Watchlists overview (`/watchlists`) — a grid of rich per-list cards (the radar summary card:
 * name, count, analyst read, sentiment mix, avg confidence/±%, member chips) plus a "+ Crear lista"
 * affordance. Replaces the old dual-pane editor: names no longer truncate, and there is no inline
 * editor, so editing only happens in the scoped form reached from a specific list. Card body →
 * `/watchlists/:id` (detail). Auth-gated. Enrichment is owned by the component-scoped
 * `WatchlistsOverviewStore`.
 */
@Component({
  selector: 'app-watchlists-overview-page',
  standalone: true,
  imports: [
    RouterLink,
    EmptyStateComponent,
    FeaturePageHeaderComponent,
    WatchlistSummaryCardComponent,
  ],
  providers: [WatchlistsOverviewStore],
  templateUrl: './watchlists-overview-page.component.html',
  styleUrl: './watchlists-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistsOverviewPageComponent implements OnInit {
  readonly store = inject(WatchlistsOverviewStore);
  readonly i18n = inject(TranslationService);

  ngOnInit(): void {
    void this.store.load();
  }
}
