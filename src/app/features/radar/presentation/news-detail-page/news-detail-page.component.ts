import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  InstrumentTickerBadgeComponent,
  SpinnerComponent,
} from '../../../../shared';
import { NewsDetailStore } from '../../application';
import { ImpactClass } from '../../domain';
import { providerLabel } from '../news-timeline/provider-label';
import { SignalAnalysisComponent } from '../signal-analysis/signal-analysis.component';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

const PERCENT_MULTIPLIER = 100;

/**
 * Per-news detail page (issue #38), routed at `radar/news/:id`. Fetches the
 * item by id via `NewsDetailStore` so it survives a hard refresh, renders the
 * article metadata + enrichment (sentiment, entities, related instruments),
 * and reuses the radar's AI-analysis UI for the linked signal when one exists.
 */
@Component({
  selector: 'app-news-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SpinnerComponent,
    InstrumentTickerBadgeComponent,
    SignalAnalysisComponent,
  ],
  templateUrl: './news-detail-page.component.html',
  styleUrl: './news-detail-page.component.scss',
  providers: [NewsDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsDetailPageComponent {
  readonly store = inject(NewsDetailStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private currentId: string | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id && id !== this.currentId) {
        this.currentId = id;
        void this.store.load(id);
      }
    });
  }

  impactLabel(impact: ImpactClass): string {
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  confidencePercent(confidence: number): number {
    return Math.round(confidence * PERCENT_MULTIPLIER);
  }

  sentimentValue(score: number): string {
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(2)}`;
  }

  sentimentClass(score: number): string {
    if (score > 0) {
      return 'news-detail__sentiment--positive';
    }
    if (score < 0) {
      return 'news-detail__sentiment--negative';
    }
    return '';
  }

  providerLabel(provider?: string): string | null {
    return providerLabel(provider);
  }

  onAnalyze(): void {
    void this.store.generate();
  }

  onRetry(): void {
    if (this.currentId) {
      void this.store.load(this.currentId);
    }
  }
}
