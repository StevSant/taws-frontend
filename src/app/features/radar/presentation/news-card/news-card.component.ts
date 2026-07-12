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

  sentimentLabel(): string {
    const impact = this.sentiment();
    return impact
      ? this.i18n.t(IMPACT_LABELS[impact])
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
