import { Injectable, computed, signal } from '@angular/core';
import { AssetClass, EnrichedInstrument, MarketsRepository } from '../domain';
import { computeClassTrend } from './compute-class-trend';

/** One class's expandable instrument list — the enriched rows + a mini-trend shape. */
export interface ClassInstruments {
  instruments: EnrichedInstrument[];
  /** Aggregate self-normalized trend (0..1, oldest → newest); `[]` when history is too thin. */
  trend: number[];
}

/** Single page over the small curated universe is enough for the per-class drill-downs. */
const UNIVERSE_PAGE_SIZE = 100;

/**
 * Loads the enriched instrument universe once (`GET /api/v1/instruments/enriched`) and
 * groups it by asset class, feeding the "Composición del mercado" expandable per-class
 * lists and each class's mini-trend (issue #58). One bounded request, grouped client-side
 * — never one call per class per expand. App-scoped so the grouping survives Radar revisits.
 *
 * A failure leaves `error` set and the groups empty: the composition rows still render (they
 * come from `RadarStore`), they just can't expand — the panel degrades, it doesn't crash.
 */
@Injectable({ providedIn: 'root' })
export class CompositionInstrumentsStore {
  private readonly byClassSignal = signal<ReadonlyMap<AssetClass, EnrichedInstrument[]>>(new Map());
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private loaded = false;

  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Per-class enriched rows + mini-trend, recomputed when the grouping changes. */
  readonly byClass = computed<ReadonlyMap<AssetClass, ClassInstruments>>(() => {
    const result = new Map<AssetClass, ClassInstruments>();
    for (const [assetClass, instruments] of this.byClassSignal()) {
      result.set(assetClass, { instruments, trend: computeClassTrend(instruments) });
    }
    return result;
  });

  constructor(private readonly marketsRepository: MarketsRepository) {}

  forClass(assetClass: AssetClass): ClassInstruments | null {
    return this.byClass().get(assetClass) ?? null;
  }

  /** Loads + groups the enriched universe once; subsequent calls are no-ops. */
  async load(): Promise<void> {
    if (this.loaded || this.loadingSignal()) {
      return;
    }
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const page = await this.marketsRepository.fetchEnrichedInstruments({
        pageSize: UNIVERSE_PAGE_SIZE,
      });
      const grouped = new Map<AssetClass, EnrichedInstrument[]>();
      for (const instrument of page.items) {
        const existing = grouped.get(instrument.assetClass) ?? [];
        existing.push(instrument);
        grouped.set(instrument.assetClass, existing);
      }
      this.byClassSignal.set(grouped);
      this.loaded = true;
    } catch (error: unknown) {
      this.errorSignal.set(
        error instanceof Error ? error.message : 'Unknown error while loading instruments',
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
