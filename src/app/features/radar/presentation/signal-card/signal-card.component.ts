import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { AssetClass, ImpactClass, RadarSignal } from '../../domain';
import { VolatilityRegimeLevel } from '../../domain/models/market-stats.model';
import { RadarStore } from '../../application';
import { TranslationKey, TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import {
  ButtonComponent,
  ConfidenceGaugeComponent,
  ImpactCompassComponent,
  ReturnSparklineComponent,
} from '../../../../shared';
import { buildCandlestickSpec, ChartComponent, ChartSpec, OhlcBar } from '../../../../shared/charts';
import {
  ReviewDecisionSubmitted,
  ReviewPanelComponent,
} from '../../../briefings/presentation/review-panel/review-panel.component';

const IMPACT_CLASS_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

const ASSET_CLASS_LABELS: Record<AssetClass, TranslationKey> = {
  stock: 'radar.assetClass.stock',
  crypto: 'radar.assetClass.crypto',
  credit: 'radar.assetClass.credit',
  commodity: 'radar.assetClass.commodity',
  forex: 'radar.assetClass.forex',
};

const VOLATILITY_LABELS: Record<VolatilityRegimeLevel, TranslationKey> = {
  low: 'radar.landscape.regime.low',
  normal: 'radar.landscape.regime.normal',
  elevated: 'radar.landscape.regime.elevated',
  high: 'radar.landscape.regime.high',
};

const PERCENT_MULTIPLIER = 100;

/** A candlestick needs at least this many candles to be worth rendering over the sparkline. */
const MIN_CANDLES_FOR_CHART = 2;

@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ConfidenceGaugeComponent,
    ImpactCompassComponent,
    ReturnSparklineComponent,
    ChartComponent,
    ButtonComponent,
    ReviewPanelComponent,
  ],
  templateUrl: './signal-card.component.html',
  styleUrl: './signal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalCardComponent implements OnInit {
  @Input({ required: true }) signal!: RadarSignal;

  readonly store = inject(RadarStore);
  readonly auth = inject(AuthStore);
  readonly i18n = inject(TranslationService);
  readonly showAllNews = signal(false);

  /** Cached candlestick spec, rebuilt only when the underlying candles array changes. */
  private cachedCandles: OhlcBar[] | null = null;
  private cachedSpec: ChartSpec | null = null;

  ngOnInit(): void {
    if (this.signal.signalId) {
      void this.store.ensureSignalReviews(this.signal.signalId);
    }
  }

  impactClassLabel(impactClass: ImpactClass): string {
    return this.i18n.t(IMPACT_CLASS_LABELS[impactClass]);
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  volatilityLabel(regime: VolatilityRegimeLevel): string {
    return this.i18n.t(VOLATILITY_LABELS[regime]);
  }

  /** Candlestick spec for the shared chart, memoized by candles-array reference. */
  candlestickSpec(): ChartSpec | null {
    const candles = this.signal.marketStats?.candles ?? null;
    if (!candles || candles.length < MIN_CANDLES_FOR_CHART) {
      this.cachedCandles = null;
      this.cachedSpec = null;
      return null;
    }
    if (candles !== this.cachedCandles) {
      this.cachedCandles = candles;
      this.cachedSpec = buildCandlestickSpec(this.signal.symbol, candles);
    }
    return this.cachedSpec;
  }

  statusLabel(): string {
    if (this.signal.impactClass) {
      return this.impactClassLabel(this.signal.impactClass);
    }
    return this.i18n.t('radar.card.status.pending');
  }

  leadHeadline(): string {
    return this.signal.news[0]?.title ?? '';
  }

  leadSummary(): string | null {
    const summary = this.signal.news[0]?.summary?.trim();
    return summary || null;
  }

  visibleNews() {
    return this.showAllNews() ? this.signal.news : this.signal.news.slice(0, 2);
  }

  hiddenNewsCount(): number {
    return Math.max(this.signal.news.length - 2, 0);
  }

  formatPriceDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}`;
  }

  confidencePercent(confidence: number): number {
    return Math.round(confidence * PERCENT_MULTIPLIER);
  }

  toggleNews(): void {
    this.showAllNews.update((value) => !value);
  }

  onGenerate(): void {
    void this.store.generateSignal(this.signal.symbol);
  }

  onSubmitReview(event: ReviewDecisionSubmitted): void {
    if (!this.signal.signalId) {
      return;
    }
    void this.store.submitSignalReview(this.signal.signalId, event.decision, event.justification);
  }
}
