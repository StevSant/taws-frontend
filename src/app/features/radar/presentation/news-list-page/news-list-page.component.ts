import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ButtonComponent, EmptyStateComponent, SkeletonCardComponent } from '../../../../shared';
import { NewsListStore } from '../../application';
import { NewsCardComponent } from '../news-card/news-card.component';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';

/**
 * Paginated "all news" page, routed at `radar/news`. Reuses the radar filter
 * bar and the rich news card; state lives in `NewsListStore` (fresh instance
 * per navigation via `providers`).
 */
@Component({
  selector: 'app-news-list-page',
  standalone: true,
  imports: [
    RadarFiltersComponent,
    NewsCardComponent,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './news-list-page.component.html',
  styleUrl: './news-list-page.component.scss',
  providers: [NewsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsListPageComponent implements OnInit {
  readonly store = inject(NewsListStore);
  readonly i18n = inject(TranslationService);

  ngOnInit(): void {
    void this.store.init();
  }

  onRetry(): void {
    void this.store.retry();
  }

  onLoadMore(): void {
    void this.store.loadMore();
  }
}
