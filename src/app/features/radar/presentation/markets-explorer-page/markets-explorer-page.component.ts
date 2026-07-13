import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  InstrumentTickerBadgeComponent,
  SkeletonCardComponent,
} from '../../../../shared';
import { MarketsExplorerStore } from '../../application';
import {
  ASSET_CLASSES,
  AssetClass,
  CoinCandidate,
  EnrichedInstrument,
  ImpactClass,
  InstrumentSortField,
} from '../../domain';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';
import { MarketsSparklineComponent } from '../markets-sparkline/markets-sparkline.component';

/** Asset-class filter pills, `null` = "Todos". */
const FILTER_OPTIONS: readonly (AssetClass | null)[] = [null, ...ASSET_CLASSES];

/** Type-safe map from a signal's impact class to its i18n label key. */
const SIGNAL_LABEL_KEYS: Record<ImpactClass, TranslationKey> = {
  positive: 'markets.signal.positive',
  negative: 'markets.signal.negative',
  neutral: 'markets.signal.neutral',
  uncertain: 'markets.signal.uncertain',
};

/**
 * Markets explorer page (issue #59): a Binance-style table of every instrument with price,
 * 24h change, volatility, sparkline and AI signal per row; asset-class filters, sortable
 * columns, inline search, per-row follow/unfollow, and highlight leaderboards above the table.
 *
 * All view/query state lives in the component-scoped `MarketsExplorerStore`, which owns the
 * single enriched fetch (no per-row fan-out). Reachable from the dashboard composition rows
 * (pre-filtered by class via the `assetClass` query param), the "Ver todas" links, and the
 * add-instrument flow.
 */
@Component({
  selector: 'app-markets-explorer-page',
  standalone: true,
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    InstrumentTickerBadgeComponent,
    MarketsSparklineComponent,
  ],
  providers: [MarketsExplorerStore],
  templateUrl: './markets-explorer-page.component.html',
  styleUrl: './markets-explorer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketsExplorerPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly labelKeys = ASSET_CLASS_LABEL_KEYS;

  protected readonly pageLabel = computed(
    () => `${this.store.page()} / ${this.store.totalPages()}`,
  );

  constructor(
    readonly store: MarketsExplorerStore,
    readonly i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('assetClass');
    const assetClass = this.isAssetClass(raw) ? raw : null;
    void this.store.init(assetClass);
  }

  onFilter(assetClass: AssetClass | null): void {
    void this.store.setAssetClass(assetClass);
  }

  onSearch(value: string): void {
    this.store.setSearch(value);
  }

  onSort(field: InstrumentSortField): void {
    void this.store.setSort(field);
  }

  sortIndicator(field: InstrumentSortField): string {
    if (this.store.sortBy() !== field) {
      return '';
    }
    return this.store.sortDir() === 'asc' ? '▲' : '▼';
  }

  goToPage(page: number): void {
    void this.store.setPage(page);
  }

  openDetail(symbol: string): void {
    void this.router.navigate(['/radar', symbol]);
  }

  onFollow(row: EnrichedInstrument, event: Event): void {
    event.stopPropagation();
    void this.store.toggleFollow(row.symbol, row.name);
  }

  onRetry(): void {
    void this.store.retry();
  }

  /** Search CoinGecko for the current query (from the empty state — finds coins not yet in the catalog). */
  onSearchCoinGecko(): void {
    void this.store.searchCoinGecko();
  }

  /** Register a searched coin: persists it to the global catalog + reloads the table so it shows up. */
  onRegisterCoin(candidate: CoinCandidate): void {
    void this.store.registerAndReload(candidate);
  }

  signalLabel(row: EnrichedInstrument): string {
    if (!row.latestSignal) {
      return this.i18n.t('markets.signal.none');
    }
    return this.i18n.t(SIGNAL_LABEL_KEYS[row.latestSignal.impactClass]);
  }

  isPositive(row: EnrichedInstrument): boolean | null {
    if (row.priceDeltaPct === null) {
      return null;
    }
    return row.priceDeltaPct >= 0;
  }

  formatPrice(value: number | null, currency: string): string {
    if (value === null) {
      return '—';
    }
    const fractionDigits = Math.abs(value) >= 100 ? 2 : value < 1 ? 4 : 2;
    return `${value.toLocaleString(this.i18n.locale(), {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })} ${currency}`;
  }

  formatPct(value: number | null): string {
    if (value === null) {
      return '—';
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /** Compact currency formatting for large magnitudes (e.g. `$950.0B`, `$32.4M`). */
  formatCompactCurrency(value: number | null, currency: string): string {
    if (value === null) {
      return '—';
    }
    const compact = new Intl.NumberFormat(this.i18n.locale(), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
    return `${compact} ${currency}`;
  }

  private isAssetClass(value: string | null): value is AssetClass {
    return value !== null && (ASSET_CLASSES as readonly string[]).includes(value);
  }
}
