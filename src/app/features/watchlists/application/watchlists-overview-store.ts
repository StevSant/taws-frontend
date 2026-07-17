import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService } from '../../../core';
import { WatchlistStore } from '../../briefings/application';
import { Watchlist } from '../../briefings/domain';
import {
  computeWatchlistSummary,
  latestSignalBySymbol,
  mapInBatches,
  WatchlistSummary,
} from '../../radar/application';
import {
  Instrument,
  InstrumentRepository,
  MarketStats,
  QuantRepository,
  RadarSignal,
  Signal,
  SignalRepository,
} from '../../radar/domain';

/** Per-symbol enrichment fan-out width — one latest-signal + one market-stats call each. */
const ENRICH_BATCH_SIZE = 6;

/**
 * Component-scoped facade for the watchlists overview (`/watchlists`). Resolves a rich
 * `WatchlistSummary` per list identically to the radar strip (`computeWatchlistSummary`), but
 * standalone — it enriches the union of every list's symbols once from the backend rather than
 * reading the in-memory radar feed, so the overview works on a cold visit and survives a refresh.
 *
 * Auth-gated (`available`). Every per-symbol sub-load is best-effort: a signal/stats failure leaves
 * that field `undefined` and never blanks a card. Provided in the page component's `providers`.
 */
@Injectable()
export class WatchlistsOverviewStore {
  private readonly summariesSignal = signal<WatchlistSummary[]>([]);
  private readonly loadingSignal = signal(false);

  readonly summaries = this.summariesSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly available = computed(() => this.authTokenService.currentToken() !== null);

  constructor(
    private readonly watchlistStore: WatchlistStore,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly signalRepository: SignalRepository,
    private readonly quantRepository: QuantRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async load(): Promise<void> {
    if (!this.available()) {
      return;
    }
    this.loadingSignal.set(true);
    try {
      await this.watchlistStore.ensureLoaded();
      // Immediate paint: name + count from the cached items, unclassified until enrichment lands.
      this.summariesSignal.set(this.buildSummaries(new Map(), new Map(), new Map()));

      const symbols = this.watchlistStore.allSymbols();
      const [instrumentsBySymbol, signalsBySymbol, statsBySymbol] = await Promise.all([
        this.loadInstruments(),
        this.loadSignals(symbols),
        this.loadStats(symbols),
      ]);
      this.summariesSignal.set(
        this.buildSummaries(instrumentsBySymbol, signalsBySymbol, statsBySymbol),
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private buildSummaries(
    instrumentsBySymbol: Map<string, Instrument>,
    signalsBySymbol: Map<string, Signal>,
    statsBySymbol: Map<string, MarketStats>,
  ): WatchlistSummary[] {
    const itemsById = this.watchlistStore.itemsByWatchlistId();
    return this.watchlistStore.watchlists().map((watchlist: Watchlist) => {
      const symbols = (itemsById.get(watchlist.id) ?? []).map((item) => item.symbol.toUpperCase());
      const radarSignals = symbols.map((symbol) =>
        this.toRadarSignal(symbol, instrumentsBySymbol, signalsBySymbol, statsBySymbol),
      );
      return computeWatchlistSummary(watchlist, radarSignals);
    });
  }

  private toRadarSignal(
    symbol: string,
    instrumentsBySymbol: Map<string, Instrument>,
    signalsBySymbol: Map<string, Signal>,
    statsBySymbol: Map<string, MarketStats>,
  ): RadarSignal {
    const signal = signalsBySymbol.get(symbol);
    const marketStats = statsBySymbol.get(symbol);
    return {
      symbol,
      instrument: instrumentsBySymbol.get(symbol),
      news: [],
      impactClass: signal?.impactClass,
      confidence: signal?.confidence,
      priceDelta: signal?.priceDelta ?? marketStats?.priceDeltaPct ?? undefined,
      signalId: signal?.id,
      thesis: signal?.thesis,
      keyDrivers: signal?.keyDrivers ?? [],
      riskFactors: signal?.riskFactors ?? [],
      analysisAvailable: signal?.analysisAvailable,
      disclaimer: signal?.disclaimer,
      marketStats,
    };
  }

  private async loadInstruments(): Promise<Map<string, Instrument>> {
    try {
      const instruments = await this.instrumentRepository.fetchInstruments();
      return new Map(
        instruments.map((instrument) => [instrument.symbol.toUpperCase(), instrument] as const),
      );
    } catch {
      return new Map();
    }
  }

  private async loadSignals(symbols: string[]): Promise<Map<string, Signal>> {
    const fetched = await mapInBatches(symbols, ENRICH_BATCH_SIZE, async (symbol) => {
      try {
        return await this.signalRepository.fetchSignals(symbol);
      } catch {
        return [];
      }
    });
    return latestSignalBySymbol(fetched.flat());
  }

  private async loadStats(symbols: string[]): Promise<Map<string, MarketStats>> {
    const fetched = await mapInBatches(symbols, ENRICH_BATCH_SIZE, async (symbol) => {
      try {
        const stats = await this.quantRepository.fetchMarketStats(symbol);
        return [symbol, stats] as const;
      } catch {
        return null;
      }
    });
    const map = new Map<string, MarketStats>();
    for (const entry of fetched) {
      if (entry) {
        map.set(entry[0], entry[1]);
      }
    }
    return map;
  }
}
