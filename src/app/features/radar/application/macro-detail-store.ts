import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_MACRO_RANGE_DAYS, MacroIndicator, MacroSeries } from '../domain';
import { MacroSeriesStore } from './macro-series-store';

/**
 * View-state facade for the macro indicator detail page (`radar/macro/:indicator`, #58).
 * Owns the page's own selectable range (independent of the compact strip) and reads the
 * fetched history through the shared `MacroSeriesStore` cache, so a range already loaded
 * by the strip paints instantly. Provided in the page's `providers` for a fresh instance
 * per navigation.
 */
@Injectable()
export class MacroDetailStore {
  private readonly series = inject(MacroSeriesStore);

  private readonly indicatorSignal = signal<MacroIndicator | null>(null);
  private readonly rangeSignal = signal<number>(DEFAULT_MACRO_RANGE_DAYS);

  readonly indicator = this.indicatorSignal.asReadonly();
  readonly range = this.rangeSignal.asReadonly();

  readonly currentSeries = computed<MacroSeries | null>(() => {
    const indicator = this.indicatorSignal();
    return indicator ? this.series.seriesFor(indicator, this.rangeSignal()) : null;
  });

  readonly isLoading = computed<boolean>(() => {
    const indicator = this.indicatorSignal();
    return indicator ? this.series.isLoadingFor(indicator, this.rangeSignal()) : false;
  });

  /** True once loading finished for the current range but the series is empty/unavailable. */
  readonly isUnavailable = computed<boolean>(
    () => !this.isLoading() && (this.currentSeries()?.observations.length ?? 0) === 0,
  );

  async load(indicator: MacroIndicator): Promise<void> {
    this.indicatorSignal.set(indicator);
    await this.series.ensure(indicator, this.rangeSignal());
  }

  async setRange(days: number): Promise<void> {
    if (this.rangeSignal() === days) {
      return;
    }
    this.rangeSignal.set(days);
    const indicator = this.indicatorSignal();
    if (indicator) {
      await this.series.ensure(indicator, days);
    }
  }
}
