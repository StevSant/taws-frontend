import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { RelevantNewsStore } from '../../application';
import { RelevantNews } from '../../domain';

/** Sentiment accent buckets — map to --color-gain/--color-loss/--color-warn in SCSS. */
type NewsSentiment = 'positive' | 'negative' | 'neutral';

/** |score| above which an article reads as directional rather than neutral. */
const SENTIMENT_THRESHOLD = 0.15;
const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;
/** Ticker chips shown before collapsing the rest into a "+N" chip. */
const MAX_VISIBLE_SYMBOLS = 3;
/** Fixed number of skeleton placeholders while the feed loads. */
const SKELETON_SLOTS = [1, 2, 3, 4];

/**
 * Compact, horizontally-scrollable strip of watchlist-relevant news for the
 * briefings condensed home. Presentation-only: it reads
 * `RelevantNewsStore.relevantNews()`/`isLoadingNews()`/`newsError()` and never
 * touches HTTP. Each card links in-app to the news detail route
 * (`/radar/news/:id`) via `routerLink`.
 */
@Component({
  selector: 'app-news-strip',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './news-strip.component.html',
  styleUrl: './news-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsStripComponent {
  readonly store = inject(RelevantNewsStore);
  readonly i18n = inject(TranslationService);

  readonly skeletonSlots = SKELETON_SLOTS;

  /** Maps a news item's sentiment score to an accent bucket, or `null` when unscored. */
  sentiment(news: RelevantNews): NewsSentiment | null {
    const score = news.sentimentScore;
    if (score === undefined) {
      return null;
    }
    if (score > SENTIMENT_THRESHOLD) {
      return 'positive';
    }
    if (score < -SENTIMENT_THRESHOLD) {
      return 'negative';
    }
    return 'neutral';
  }

  visibleSymbols(news: RelevantNews): string[] {
    return news.relatedSymbols.slice(0, MAX_VISIBLE_SYMBOLS);
  }

  extraSymbolCount(news: RelevantNews): number {
    return Math.max(0, news.relatedSymbols.length - MAX_VISIBLE_SYMBOLS);
  }

  /** Localized "Hace 3 h" / "3 h ago"-style relative timestamp. */
  relativeTime(news: RelevantNews): string {
    const minutes = Math.floor((Date.now() - Date.parse(news.publishedAt)) / MINUTE_MS);
    const ago = this.i18n.t('radar.timeline.ago');
    if (minutes < HOUR_MINUTES) {
      return `${ago} ${Math.max(1, minutes)} min`;
    }
    const hours = Math.floor(minutes / HOUR_MINUTES);
    if (hours < DAY_HOURS) {
      return `${ago} ${hours} h`;
    }
    return `${ago} ${Math.floor(hours / DAY_HOURS)} d`;
  }

  onRetry(): void {
    void this.store.reload();
  }
}
