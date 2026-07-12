import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { ImpactClass, NewsItem } from '../../domain';
import { providerLabel } from '../news-timeline/provider-label';
import { classifyNewsSentiment } from './classify-news-sentiment';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

const PERCENT_MULTIPLIER = 100;
const MINUTE_MS = 60_000;
/** Ticker chips shown before collapsing the rest into a "+N" chip. */
const MAX_VISIBLE_SYMBOLS = 4;

/**
 * Reusable rich news card: sentiment badge, confidence %, source/provider, relative time and
 * headline, clickable through to the news detail page (`radar/news/:id`). Shared by the
 * asset-detail "related news" list (issue #56) and the news-detail "related news" list
 * (issue #57), keeping both visually consistent with the home news timeline.
 */
@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './news-card.component.html',
  styleUrl: './news-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCardComponent {
  @Input({ required: true }) news!: NewsItem;

  readonly i18n = inject(TranslationService);

  sentiment(): ImpactClass | null {
    return classifyNewsSentiment(this.news.sentimentScore);
  }

  /**
   * Whether this article is linked to no instrument at all — a distinct, terminal state, not
   * a pending one (issue #68). Signals are generated per instrument, so such an article will
   * never be classified, however long you wait. Collapsing it into "Sin clasificar" alongside
   * items that simply haven't been analyzed yet is what made the whole feed look broken.
   *
   * Trusts the backend's persisted `skipReason` first, and falls back to the absence of
   * `relatedSymbols` for items no analysis run has looked at yet.
   */
  hasNoInstrument(): boolean {
    return this.news.skipReason === 'no_linked_instrument' || this.news.relatedSymbols.length === 0;
  }

  sentimentLabel(): string {
    const impact = this.sentiment();
    if (impact) {
      return this.i18n.t(IMPACT_LABELS[impact]);
    }
    return this.hasNoInstrument()
      ? this.i18n.t('radar.card.impact.noInstrument')
      : this.i18n.t('radar.card.impact.unclassified');
  }

  confidenceLabel(): string | null {
    const score = this.news.sentimentScore;
    if (score === undefined) {
      return null;
    }
    return `${Math.round(Math.abs(score) * PERCENT_MULTIPLIER)}%`;
  }

  providerLabel(): string | null {
    return providerLabel(this.news.provider);
  }

  visibleSymbols(): string[] {
    return this.news.relatedSymbols.slice(0, MAX_VISIBLE_SYMBOLS);
  }

  extraSymbolCount(): number {
    return Math.max(0, this.news.relatedSymbols.length - MAX_VISIBLE_SYMBOLS);
  }

  relativeTime(): string {
    const minutes = Math.floor((Date.now() - Date.parse(this.news.publishedAt)) / MINUTE_MS);
    const ago = this.i18n.t('radar.timeline.ago');
    if (minutes < 60) {
      return `${ago} ${Math.max(1, minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${ago} ${hours} h`;
    }
    return `${ago} ${Math.floor(hours / 24)} d`;
  }
}
