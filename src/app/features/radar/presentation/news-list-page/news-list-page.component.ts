import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  PaginationComponent,
  SkeletonCardComponent,
} from '../../../../shared';
import { NewsListStore } from '../../application';
import { NewsCardComponent } from '../news-card/news-card.component';
import { NewsFiltersComponent } from '../news-filters/news-filters.component';

/**
 * Numbered "all news" page, routed at `radar/news`. Backed by the browse endpoint
 * (server-side filter/sort + an exact total) via `NewsListStore`, so it renders the shared
 * `PaginationComponent` — "Página X de Y" — instead of the old "Load more" button, and
 * paging replaces the item set rather than appending to it (issue #70).
 *
 * The radar home timeline deliberately keeps its "Show more" feed: it reads the live
 * provider endpoint, which has no total to page against.
 *
 * Fresh store per navigation via `providers`.
 */
@Component({
  selector: 'app-news-list-page',
  standalone: true,
  imports: [
    NewsFiltersComponent,
    NewsCardComponent,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    PaginationComponent,
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

  onPageChange(page: number): void {
    void this.store.goToPage(page);
  }
}
