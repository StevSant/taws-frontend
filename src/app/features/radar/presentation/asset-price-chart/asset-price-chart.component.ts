import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslationService } from '../../../../core';
import { AppConfigService } from '../../../../core';
import { SpinnerComponent } from '../../../../shared';
import {
  buildCandlestickSpec,
  ChartComponent,
  ChartRepository,
  ChartSpec,
  OhlcBar,
} from '../../../../shared/charts';

/** A candlestick needs at least this many candles to be worth rendering. */
const MIN_CANDLES_FOR_CHART = 2;

/**
 * Interactive price chart for a single instrument (issue #42). Wraps the shared `taws-chart`
 * ECharts renderer and feeds it a real OHLC + volume candlestick spec.
 *
 * Two data paths, in priority order:
 * 1. `POST /api/v1/charts/render` (via `ChartRepository`) — returns a spec with the backend's
 *    timeframe set, so the shared chart shows working timeframe buttons that re-request the
 *    series. That endpoint is auth-guarded.
 * 2. Static fallback built from `fallbackCandles` (the quant OHLC series from the public
 *    `GET /api/v1/quant/stats`) — used when the render call fails (anonymous user, unknown
 *    symbol, network). No timeframe buttons, but the chart still renders with axes + crosshair.
 *
 * The displayed spec is a `computed` of `backendSpec ?? fallbackSpec`, so if the candles arrive
 * after a failed render call the chart fills in automatically without another request.
 */
@Component({
  selector: 'app-asset-price-chart',
  standalone: true,
  imports: [ChartComponent, SpinnerComponent],
  templateUrl: './asset-price-chart.component.html',
  styleUrl: './asset-price-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPriceChartComponent {
  readonly symbol = input.required<string>();
  readonly fallbackCandles = input<OhlcBar[]>([]);

  readonly i18n = inject(TranslationService);
  private readonly charts = inject(ChartRepository);
  private readonly config = inject(AppConfigService);

  private readonly backendSpec = signal<ChartSpec | null>(null);
  readonly loading = signal(false);
  private loadedSymbol: string | null = null;

  /** Static spec from the quant candles — always available anonymously. */
  private readonly fallbackSpec = computed<ChartSpec | null>(() => {
    const candles = this.fallbackCandles();
    if (candles.length < MIN_CANDLES_FOR_CHART) {
      return null;
    }
    return buildCandlestickSpec(this.symbol(), candles);
  });

  /** Backend (interactive) spec wins; falls back to the static quant-candles spec. */
  readonly displaySpec = computed<ChartSpec | null>(
    () => this.backendSpec() ?? this.fallbackSpec(),
  );

  readonly isUnavailable = computed(() => !this.loading() && this.displaySpec() === null);

  constructor() {
    effect(() => {
      const symbol = this.symbol();
      if (symbol && symbol !== this.loadedSymbol) {
        this.loadedSymbol = symbol;
        void this.loadFromBackend(symbol);
      }
    });
  }

  private async loadFromBackend(symbol: string): Promise<void> {
    this.loading.set(true);
    this.backendSpec.set(null);
    try {
      const spec = await this.charts.render({
        kind: 'price_candlestick',
        symbols: [symbol],
        timeframe: this.config.chartDefaultTimeframe,
      });
      // Ignore a stale response if the input symbol changed mid-flight.
      if (this.symbol() === symbol) {
        this.backendSpec.set(spec);
      }
    } catch {
      // Auth-guarded endpoint or unknown symbol — the `fallbackSpec` computed
      // renders the static quant-candles chart instead. No error surfaced: an
      // interactive chart is an enhancement over the always-available fallback.
    } finally {
      if (this.symbol() === symbol) {
        this.loading.set(false);
      }
    }
  }
}
