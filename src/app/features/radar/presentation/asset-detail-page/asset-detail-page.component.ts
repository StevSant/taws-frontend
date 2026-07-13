import { DecimalPipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  InstrumentTickerBadgeComponent,
  PaginationComponent,
  SpinnerComponent,
} from '../../../../shared';
import { ShellSearchService } from '../../../../layout/shell/shell-search.service';
import { ChartDateWindow } from '../../../../shared/charts';
import { AssetDetailStore, buildAssetSource } from '../../application';
import { AssetClass, AssetSource, ImpactClass, Instrument } from '../../domain';
import { VolatilityRegimeLevel } from '../../domain/models/market-stats.model';
import { AssetPriceChartComponent } from '../asset-price-chart/asset-price-chart.component';
import { NewsCardComponent } from '../news-card/news-card.component';
import { SignalAnalysisComponent } from '../signal-analysis/signal-analysis.component';
import { navigateDetailBack } from '../navigate-detail-back';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
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

/**
 * Per-asset detail page (`radar/:symbol`, issue #43). Fetches everything by symbol via
 * `AssetDetailStore` so it survives a hard refresh, and renders the interactive price chart
 * (`AssetPriceChartComponent`, issue #42), quant stats, the latest signal's AI analysis
 * (`SignalAnalysisComponent`), related news, and an add/remove-from-watchlist toggle.
 */
@Component({
  selector: 'app-asset-detail-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SpinnerComponent,
    InstrumentTickerBadgeComponent,
    AssetPriceChartComponent,
    SignalAnalysisComponent,
    NewsCardComponent,
    PaginationComponent,
  ],
  templateUrl: './asset-detail-page.component.html',
  styleUrl: './asset-detail-page.component.scss',
  providers: [AssetDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetailPageComponent {
  readonly store = inject(AssetDetailStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly shellSearch = inject(ShellSearchService);
  private currentSymbol: string | null = null;

  /** Date window last selected on the price chart (via zoom); drives the "ask why" action. */
  readonly selectedWindow = signal<ChartDateWindow | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const symbol = params.get('symbol');
      if (symbol && symbol !== this.currentSymbol) {
        this.currentSymbol = symbol;
        void this.store.load(symbol);
      }
    });
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  assetSource(instrument: Instrument): AssetSource {
    return buildAssetSource(instrument.symbol, instrument.assetClass);
  }

  impactLabel(impact: ImpactClass): string {
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  volatilityLabel(regime: VolatilityRegimeLevel): string {
    return this.i18n.t(VOLATILITY_LABELS[regime]);
  }

  confidencePercent(confidence: number): number {
    return Math.round(confidence * PERCENT_MULTIPLIER);
  }

  formatDelta(delta: number | null): string {
    if (delta === null) {
      return '—';
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}%`;
  }

  deltaClass(delta: number | null): string {
    if (delta === null || delta === 0) {
      return '';
    }
    return delta > 0 ? 'asset-detail__delta--up' : 'asset-detail__delta--down';
  }

  onToggleWatchlist(): void {
    void this.store.toggleWatchlist(this.i18n.t('radar.detail.watchlist.defaultName'));
  }

  onGenerate(): void {
    void this.store.generate();
  }

  onRetry(): void {
    void this.store.retry();
  }

  /** Opens the chat grounded on this asset (issue #73). */
  onAskMidas(): void {
    const instrument = this.store.instrument();
    if (!instrument) {
      return;
    }
    void this.shellSearch.goToChatWithReference({
      kind: 'asset',
      symbol: instrument.symbol,
      name: instrument.name,
    });
  }

  onChartWindow(window: ChartDateWindow): void {
    this.selectedWindow.set(window);
  }

  /** Opens a new chat asking why this asset moved in the selected chart window (issue #73). */
  onAskWhy(): void {
    const instrument = this.store.instrument();
    const window = this.selectedWindow();
    if (!instrument || !window) {
      return;
    }
    const prompt = this.i18n
      .t('radar.detail.askWhy.prompt')
      .replace('{symbol}', instrument.symbol)
      .replace('{from}', window.fromDate)
      .replace('{to}', window.toDate);
    void this.shellSearch.goToChatWithReference(
      {
        kind: 'asset',
        symbol: instrument.symbol,
        name: instrument.name,
        fromDate: window.fromDate,
        toDate: window.toDate,
      },
      prompt,
    );
  }

  onBack(event: MouseEvent): void {
    navigateDetailBack(this.router, this.location, '/radar/explore', event);
  }
}
