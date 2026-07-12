import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_MACRO_RANGE_DAYS,
  MACRO_INDICATORS,
  MacroIndicator,
  MacroRepository,
  MacroSeries,
} from '../domain';

function cacheKey(indicator: MacroIndicator, days: number): string {
  return `${indicator}:${days}`;
}

/**
 * Signal-based facade for the "Contexto de mercado" macro history (issue #58). Owns the
 * shared time-range for the compact sparklines and a per-(indicator, range) cache of the
 * fetched series, so switching the range refetches once per indicator and revisits are
 * instant. Both the `RadarMacroIndicatorsComponent` strip (all indicators at the shared
 * range) and the `MacroDetailPage` (one indicator, its own range) read through it.
 *
 * Every fetch is wrapped so a single indicator failing leaves that card in a muted "sin
 * datos" state instead of blanking the panel — same posture as `RadarStore.loadMacroState`.
 * App-scoped so the strip keeps its loaded history across Radar revisits.
 */
@Injectable({ providedIn: 'root' })
export class MacroSeriesStore {
  private readonly seriesSignal = signal<ReadonlyMap<string, MacroSeries>>(new Map());
  private readonly loadingSignal = signal<ReadonlySet<string>>(new Set());
  private readonly rangeSignal = signal<number>(DEFAULT_MACRO_RANGE_DAYS);

  /** Shared range (days) for the compact strip. */
  readonly range = this.rangeSignal.asReadonly();

  /** Number of indicators still loading at the current strip range — drives the busy hint. */
  readonly stripLoadingCount = computed(() => {
    const days = this.rangeSignal();
    const loading = this.loadingSignal();
    return MACRO_INDICATORS.filter((indicator) => loading.has(cacheKey(indicator, days))).length;
  });

  constructor(private readonly macroRepository: MacroRepository) {}

  seriesFor(indicator: MacroIndicator, days: number): MacroSeries | null {
    return this.seriesSignal().get(cacheKey(indicator, days)) ?? null;
  }

  isLoadingFor(indicator: MacroIndicator, days: number): boolean {
    return this.loadingSignal().has(cacheKey(indicator, days));
  }

  /** Loads every series-backed indicator at the shared strip range (cached, no refetch). */
  async loadStrip(): Promise<void> {
    const days = this.rangeSignal();
    await Promise.all(MACRO_INDICATORS.map((indicator) => this.ensure(indicator, days)));
  }

  /** Changes the shared strip range and reloads the strip for that range. */
  async setRange(days: number): Promise<void> {
    if (this.rangeSignal() === days) {
      return;
    }
    this.rangeSignal.set(days);
    await this.loadStrip();
  }

  /** Fetches one (indicator, range) into the cache unless already present or in flight. */
  async ensure(indicator: MacroIndicator, days: number): Promise<void> {
    const key = cacheKey(indicator, days);
    if (this.seriesSignal().has(key) || this.loadingSignal().has(key)) {
      return;
    }
    this.loadingSignal.update((current) => new Set(current).add(key));
    try {
      const series = await this.macroRepository.fetchMacroSeries(indicator, days);
      this.seriesSignal.update((current) => new Map(current).set(key, series));
    } catch {
      // A single indicator failing leaves its card muted, not the whole panel — deliberate.
    } finally {
      this.loadingSignal.update((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }
}
