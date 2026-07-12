import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { QuantRepository } from '../../../radar/domain';
import { AssetPriceChartComponent } from '../../../radar/presentation/asset-price-chart/asset-price-chart.component';
import { OhlcBar } from '../../../../shared/charts';

const CHART_WINDOW_DAYS = 365;

/**
 * Price chart for scenario affected symbols — loads public quant candles first so the
 * chart renders even without auth, then lets `AssetPriceChartComponent` upgrade via
 * `POST /charts/render` when the user is signed in.
 */
@Component({
  selector: 'app-scenario-symbol-chart',
  standalone: true,
  imports: [AssetPriceChartComponent],
  template: `<app-asset-price-chart [symbol]="symbol()" [fallbackCandles]="candles()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSymbolChartComponent {
  readonly symbol = input.required<string>();

  private readonly quant = inject(QuantRepository);
  readonly candles = signal<OhlcBar[]>([]);
  private loadedSymbol: string | null = null;

  constructor() {
    effect(() => {
      const symbol = this.symbol();
      if (symbol && symbol !== this.loadedSymbol) {
        this.loadedSymbol = symbol;
        void this.loadCandles(symbol);
      }
    });
  }

  private async loadCandles(symbol: string): Promise<void> {
    this.candles.set([]);
    try {
      const stats = await this.quant.fetchMarketStats(symbol, CHART_WINDOW_DAYS);
      if (this.symbol() === symbol) {
        this.candles.set(stats.candles);
      }
    } catch {
      // Unknown symbol or network — AssetPriceChartComponent shows unavailable state.
    }
  }
}
