import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService, httpErrorDetail, TranslationService } from '../../../core';
import { WatchlistRepository } from '../../briefings/domain';
import { computeWatchlistSummary, mapInBatches, WatchlistSummary } from '../../radar/application';
import {
  EventStudyStats,
  Instrument,
  InstrumentRepository,
  QuantRepository,
  RadarSignal,
  Signal,
  SignalRepository,
} from '../../radar/domain';
import { computeWatchlistOutlook } from './compute-watchlist-outlook';
import { WatchlistDetailMember } from './watchlist-detail-member.model';
import { WatchlistOutlook } from './watchlist-outlook.model';

/** Per-symbol enrichment fan-out width — one latest-signal + one event-study call each. */
const ENRICH_BATCH_SIZE = 6;

/** One symbol's resolved enrichment before it becomes a summary card + a detail row. */
interface EnrichedMember {
  symbol: string;
  instrument?: Instrument;
  signal?: Signal;
  outlook?: EventStudyStats;
}

/**
 * Signal-based facade for the watchlist detail page (`/watchlists/:id`). Owns the view state so
 * the page survives a hard refresh — it resolves everything by id from the backend instead of
 * reading the in-memory radar feed. Mirrors `AssetDetailStore`.
 *
 * On `load(id)` it resolves the list, its members, the instrument universe, and — throttled
 * `ENRICH_BATCH_SIZE`-wide — each member's latest Analyst signal and its historical event-study
 * outlook. The summary reuses `computeWatchlistSummary` so the hero read is derived identically to
 * the radar strip card; `computeWatchlistOutlook` aggregates the members' forward base rates.
 *
 * Watchlists are authenticated, so the whole page is auth-gated via `available`. Every per-symbol
 * sub-load is best-effort: a signal or event-study failure leaves that field `undefined` and never
 * blanks the page. Provided in the page component's `providers` so each navigation is fresh.
 */
@Injectable()
export class WatchlistDetailStore {
  private readonly watchlistIdSignal = signal<string | null>(null);
  private readonly watchlistNameSignal = signal<string | null>(null);
  private readonly summarySignal = signal<WatchlistSummary | null>(null);
  private readonly membersSignal = signal<WatchlistDetailMember[]>([]);
  private readonly outlookSignal = signal<WatchlistOutlook | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly notFoundSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly watchlistId = this.watchlistIdSignal.asReadonly();
  readonly watchlistName = this.watchlistNameSignal.asReadonly();
  readonly summary = this.summarySignal.asReadonly();
  readonly members = this.membersSignal.asReadonly();
  readonly outlook = this.outlookSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isNotFound = this.notFoundSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** The `/watchlists` API is authenticated — the page shows a sign-in prompt when this is false. */
  readonly available = computed(() => this.authTokenService.currentToken() !== null);

  constructor(
    private readonly watchlistRepository: WatchlistRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly signalRepository: SignalRepository,
    private readonly quantRepository: QuantRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly i18n: TranslationService,
  ) {}

  async load(id: string): Promise<void> {
    this.watchlistIdSignal.set(id);
    this.loadingSignal.set(true);
    this.notFoundSignal.set(false);
    this.errorSignal.set(null);
    this.watchlistNameSignal.set(null);
    this.summarySignal.set(null);
    this.membersSignal.set([]);
    this.outlookSignal.set(null);

    if (!this.available()) {
      this.loadingSignal.set(false);
      return;
    }

    try {
      const watchlists = await this.watchlistRepository.fetchWatchlists();
      const watchlist = watchlists.find((candidate) => candidate.id === id);
      if (!watchlist) {
        this.notFoundSignal.set(true);
        return;
      }
      this.watchlistNameSignal.set(watchlist.name);

      const items = await this.watchlistRepository.listItems(id);
      const symbols = items.map((item) => item.symbol.toUpperCase());
      const instrumentsBySymbol = await this.loadInstrumentsBySymbol();

      const enriched = await mapInBatches(symbols, ENRICH_BATCH_SIZE, async (symbol) => {
        const [signal, outlook] = await Promise.all([
          this.loadLatestSignal(symbol),
          this.loadOutlook(symbol),
        ]);
        return {
          symbol,
          instrument: instrumentsBySymbol.get(symbol),
          signal,
          outlook,
        } satisfies EnrichedMember;
      });

      const radarSignals = enriched.map((member) => this.toRadarSignal(member));
      this.summarySignal.set(computeWatchlistSummary(watchlist, radarSignals));

      const members = enriched.map((member) => this.toDetailMember(member));
      this.membersSignal.set(members);
      this.outlookSignal.set(computeWatchlistOutlook(members));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async retry(): Promise<void> {
    const id = this.watchlistIdSignal();
    if (id) {
      await this.load(id);
    }
  }

  /** Instrument universe as a symbol → instrument map. Best-effort: an empty map on failure. */
  private async loadInstrumentsBySymbol(): Promise<Map<string, Instrument>> {
    try {
      const instruments = await this.instrumentRepository.fetchInstruments();
      return new Map(
        instruments.map((instrument) => [instrument.symbol.toUpperCase(), instrument] as const),
      );
    } catch {
      return new Map();
    }
  }

  /** Most-recent signal for a symbol, or `undefined`. Best-effort — never throws to the page. */
  private async loadLatestSignal(symbol: string): Promise<Signal | undefined> {
    try {
      const signals = await this.signalRepository.fetchSignals(symbol);
      return this.pickLatest(signals);
    } catch {
      return undefined;
    }
  }

  /** Historical outlook for a symbol, or `undefined`. Best-effort — a failure just omits it. */
  private async loadOutlook(symbol: string): Promise<EventStudyStats | undefined> {
    try {
      return await this.quantRepository.fetchEventStudy(symbol);
    } catch {
      return undefined;
    }
  }

  private pickLatest(signals: Signal[]): Signal | undefined {
    if (signals.length === 0) {
      return undefined;
    }
    return [...signals].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  }

  /** Builds the `RadarSignal` the shared summary maths consumes, identical to the radar strip. */
  private toRadarSignal({ symbol, instrument, signal }: EnrichedMember): RadarSignal {
    return {
      symbol,
      instrument,
      news: [],
      impactClass: signal?.impactClass,
      confidence: signal?.confidence,
      priceDelta: signal?.priceDelta,
      signalId: signal?.id,
      thesis: signal?.thesis,
      keyDrivers: signal?.keyDrivers ?? [],
      riskFactors: signal?.riskFactors ?? [],
      analysisAvailable: signal?.analysisAvailable,
      disclaimer: signal?.disclaimer,
    };
  }

  private toDetailMember({
    symbol,
    instrument,
    signal,
    outlook,
  }: EnrichedMember): WatchlistDetailMember {
    return {
      symbol,
      name: instrument?.name,
      assetClass: instrument?.assetClass,
      impactClass: signal?.impactClass,
      confidence: signal?.confidence,
      deltaPct: signal?.priceDelta,
      outlook,
    };
  }

  private toErrorMessage(error: unknown): string {
    console.error('Watchlist detail request failed', error);
    return httpErrorDetail(error, this.i18n);
  }
}
