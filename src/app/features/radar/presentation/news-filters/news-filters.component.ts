import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  AnalysisStatus,
  AssetClass,
  Instrument,
  NewsBrowseQuery,
  NewsFacets,
  NewsSortField,
  RadarFilters,
  SentimentFilterOption,
  SortDirection,
} from '../../domain';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';

const SENTIMENT_LABELS: Record<SentimentFilterOption, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  unclassified: 'radar.card.impact.unclassified',
};

const STATUS_LABELS: Record<AnalysisStatus, TranslationKey> = {
  pending: 'radar.newsFilters.status.pending',
  analyzed: 'radar.newsFilters.status.analyzed',
  skipped: 'radar.newsFilters.status.skipped',
};

/**
 * Filter/sort bar for the `/radar/news` browse page. Presentational only — the page
 * owns the state via `NewsListStore` and refetches on every change.
 *
 * Wraps the shared `RadarFiltersComponent` for the three facets the radar home also has
 * (type / asset / recency) rather than reimplementing them, and adds the browse-only ones
 * on top: source, sentiment, analysis status, free-text search, and sort. The radar home's
 * bar stays lean — it has no endpoint that could serve these.
 */
@Component({
  selector: 'app-news-filters',
  standalone: true,
  imports: [FormsModule, RadarFiltersComponent],
  templateUrl: './news-filters.component.html',
  styleUrl: './news-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsFiltersComponent {
  @Input({ required: true }) query!: NewsBrowseQuery;
  @Input() facets: NewsFacets = { sources: [], providers: [] };
  @Input() instrumentOptions: Instrument[] = [];

  @Output() assetClassChange = new EventEmitter<AssetClass | null>();
  @Output() symbolChange = new EventEmitter<string | null>();
  @Output() sinceHoursChange = new EventEmitter<number>();
  @Output() sourceChange = new EventEmitter<string | null>();
  @Output() providerChange = new EventEmitter<string | null>();
  @Output() sentimentChange = new EventEmitter<SentimentFilterOption | null>();
  @Output() analysisStatusChange = new EventEmitter<AnalysisStatus | null>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ sortBy: NewsSortField; sortDir: SortDirection }>();

  readonly sentimentOptions: readonly SentimentFilterOption[] = [
    'positive',
    'negative',
    'neutral',
    'unclassified',
  ];
  readonly statusOptions: readonly AnalysisStatus[] = ['pending', 'analyzed', 'skipped'];

  readonly i18n = inject(TranslationService);

  /** The subset of the browse query the shared radar filter bar understands. */
  get radarFilters(): RadarFilters {
    return {
      assetClass: this.query.assetClass,
      symbol: this.query.symbol,
      sinceHours: this.query.sinceHours,
    };
  }

  sentimentLabel(option: SentimentFilterOption): string {
    return this.i18n.t(SENTIMENT_LABELS[option]);
  }

  statusLabel(option: AnalysisStatus): string {
    return this.i18n.t(STATUS_LABELS[option]);
  }

  /** `''` from a `<select>` is the "all" option — emit `null`, i.e. no filter. */
  emitSource(value: string): void {
    this.sourceChange.emit(value || null);
  }

  emitProvider(value: string): void {
    this.providerChange.emit(value || null);
  }

  emitSentiment(value: string): void {
    this.sentimentChange.emit(value ? (value as SentimentFilterOption) : null);
  }

  emitStatus(value: string): void {
    this.analysisStatusChange.emit(value ? (value as AnalysisStatus) : null);
  }

  emitSortBy(value: string): void {
    this.sortChange.emit({ sortBy: value as NewsSortField, sortDir: this.query.sortDir });
  }

  toggleSortDir(): void {
    const sortDir: SortDirection = this.query.sortDir === 'desc' ? 'asc' : 'desc';
    this.sortChange.emit({ sortBy: this.query.sortBy, sortDir });
  }
}
