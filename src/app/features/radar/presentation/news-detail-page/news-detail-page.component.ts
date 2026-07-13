import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  InstrumentTickerBadgeComponent,
  PaginationComponent,
  SpinnerComponent,
} from '../../../../shared';
import { NewsDetailStore } from '../../application';
import { AssetClass, ImpactClass, NewsAssetImpact, NewsSkipReason } from '../../domain';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';
import { NewsCardComponent } from '../news-card/news-card.component';
import { providerLabel } from '../news-timeline/provider-label';
import { SignalAnalysisComponent } from '../signal-analysis/signal-analysis.component';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

/**
 * Prose explaining each reason an article produced no signal (issue #26) — what replaces the
 * bare "No se produjo ninguna señal para esta noticia", which read as breakage rather than as
 * the deliberate cost decision it usually was.
 */
const SKIP_REASON_LABELS: Record<NewsSkipReason, TranslationKey> = {
  gated_low_relevance: 'radar.detail.skipReason.gated_low_relevance',
  near_duplicate: 'radar.detail.skipReason.near_duplicate',
  no_linked_instrument: 'radar.detail.skipReason.no_linked_instrument',
  insufficient_evidence: 'radar.detail.skipReason.insufficient_evidence',
  compliance_blocked: 'radar.detail.skipReason.compliance_blocked',
  analysis_failed: 'radar.detail.skipReason.analysis_failed',
};

const PERCENT_MULTIPLIER = 100;
const LOCALE_TAGS: Record<string, string> = { es: 'es-ES', en: 'en-US' };

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
    DecimalPipe,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SpinnerComponent,
    InstrumentTickerBadgeComponent,
    SignalAnalysisComponent,
    NewsCardComponent,
    PaginationComponent,
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

  /**
   * Price + % change + Analyst impact for an affected symbol, or `null` when the backend
   * returned no row for it (a symbol outside the curated universe, or the degraded
   * feed-scan fallback, which carries the article but none of the enrichment).
   */
  impactFor(symbol: string): NewsAssetImpact | null {
    return this.store.affectedInstruments().find((impact) => impact.symbol === symbol) ?? null;
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABEL_KEYS[assetClass]);
  }

  /** Locale-format the published date (aligns the metadata date with the rest of the app). */
  formatPublishedAt(iso: string): string {
    const tag = LOCALE_TAGS[this.i18n.locale()] ?? this.i18n.locale();
    return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }

  formatDelta(delta: number | undefined): string {
    if (delta === undefined) {
      return '—';
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}%`;
  }

  deltaClass(delta: number | undefined): string {
    if (delta === undefined || delta === 0) {
      return '';
    }
    return delta > 0 ? 'news-detail__chip-delta--up' : 'news-detail__chip-delta--down';
  }

  /**
   * Why this article has no signal, as prose — or `null` when there's nothing to explain and
   * the generic "no signal yet" line is the honest thing to show (e.g. an item still queued
   * for the next batch run).
   */
  skipReasonLabel(): string | null {
    const reason = this.store.skipReason();
    return reason ? this.i18n.t(SKIP_REASON_LABELS[reason]) : null;
  }

  onAnalyze(): void {
    void this.store.analyze();
  }

  onRetry(): void {
    if (this.currentId) {
      void this.store.load(this.currentId);
    }
  }

  onImageError(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      img.closest('.news-detail__hero')?.remove();
    }
  }
}
