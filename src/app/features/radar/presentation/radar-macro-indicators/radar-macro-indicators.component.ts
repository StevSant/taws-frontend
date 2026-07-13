import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { PriceDeltaChipComponent } from '../../../../shared';
import { MacroSeriesStore } from '../../application';
import { MACRO_RANGE_OPTIONS_DAYS, MacroIndicator, MacroState } from '../../domain';
import { MACRO_INDICATOR_CATALOG, MacroValueFormat } from '../macro-indicator-catalog';
import { formatMacroValue, periodChangePct } from '../format-macro-value';
import {
  MacroSparklineComponent,
  MacroSparkPoint,
} from '../macro-sparkline/macro-sparkline.component';

const REGIME_LABEL_KEYS: Record<string, TranslationKey> = {
  low: 'radar.landscape.regime.low',
  normal: 'radar.landscape.regime.normal',
  elevated: 'radar.landscape.regime.elevated',
  high: 'radar.landscape.regime.high',
};

/** One "Contexto de mercado" indicator card, ready for the template. */
export interface MacroIndicatorCard {
  indicator: MacroIndicator;
  icon: string;
  label: string;
  explanation: string;
  format: MacroValueFormat;
  valueLabel: string;
  changePct: number | null;
  points: MacroSparkPoint[];
  positive: boolean | null;
  loading: boolean;
  hasData: boolean;
}

/**
 * "Contexto de mercado" indicator strip (issue #58). Replaces the old `RadarMacroStripComponent`
 * (rates/CPI bars + a hardcoded VIX gauge): every card is now driven by REAL history from
 * `GET /api/v1/macro/series/{indicator}` via `MacroSeriesStore`, with an interactive sparkline
 * (hover tooltip), a plain-language explanation, a shared time-range selector, and click-through
 * to the indicator detail view. VIX stays as a non-series informational card sourced from the
 * macro state's volatility regime.
 */
@Component({
  selector: 'app-radar-macro-indicators',
  standalone: true,
  imports: [MacroSparklineComponent, PriceDeltaChipComponent],
  templateUrl: './radar-macro-indicators.component.html',
  styleUrl: './radar-macro-indicators.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMacroIndicatorsComponent implements OnInit {
  @Input() macro: MacroState | null = null;
  @Input() layout: 'grid' | 'strip' = 'grid';

  readonly store = inject(MacroSeriesStore);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);

  readonly rangeOptions = MACRO_RANGE_OPTIONS_DAYS;

  readonly cards = computed<MacroIndicatorCard[]>(() => {
    const days = this.store.range();
    const locale = this.i18n.locale();
    const dateFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });

    return MACRO_INDICATOR_CATALOG.map((descriptor): MacroIndicatorCard => {
      const series = this.store.seriesFor(descriptor.indicator, days);
      const observations = series?.observations ?? [];
      const values = observations.map((observation) => observation.value);
      const changePct = periodChangePct(values);
      return {
        indicator: descriptor.indicator,
        icon: descriptor.icon,
        label: this.i18n.t(descriptor.labelKey),
        explanation: this.i18n.t(descriptor.explanationKey),
        format: descriptor.format,
        valueLabel: formatMacroValue(series?.latest?.value ?? null, descriptor.format),
        changePct,
        points: observations.map((observation): MacroSparkPoint => ({
          value: observation.value,
          valueLabel: formatMacroValue(observation.value, descriptor.format),
          dateLabel: dateFormatter.format(observation.asOf),
        })),
        positive: changePct === null || changePct === 0 ? null : changePct > 0,
        loading: this.store.isLoadingFor(descriptor.indicator, days),
        hasData: observations.length > 0,
      };
    });
  });

  ngOnInit(): void {
    void this.store.loadStrip();
  }

  onSelectRange(days: number): void {
    void this.store.setRange(days);
  }

  openDetail(indicator: MacroIndicator): void {
    void this.router.navigate(['/radar/macro', indicator]);
  }

  regimeLabel(regime: string): string {
    const key = REGIME_LABEL_KEYS[regime];
    return key ? this.i18n.t(key) : regime;
  }
}
